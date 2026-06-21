import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CampaignSuggestDto } from './dto/campaign-suggest.dto';

const GOAL_LABELS: Record<string, string> = {
  promocao: 'promoção ou desconto',
  retorno: 'reativar clientes que não vêm há um tempo',
  agradecimento: 'agradecer clientes fiéis',
  novidade: 'anunciar novidade (horário, serviço ou equipe)',
  personalizado: 'objetivo definido pelo barbeiro',
};

@Injectable()
export class CampaignAiService {
  constructor(private config: ConfigService) {}

  private apiKey(): string | undefined {
    return process.env.GROQ_API_KEY || this.config.get<string>('GROQ_API_KEY');
  }

  private model(): string {
    return (
      process.env.GROQ_MODEL ||
      this.config.get<string>('GROQ_MODEL') ||
      'llama-3.3-70b-versatile'
    );
  }

  async suggest(userName: string, businessName: string | null, dto: CampaignSuggestDto) {
    const apiKey = this.apiKey();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Assistente de IA não configurado. Defina GROQ_API_KEY no servidor.',
      );
    }

    const goal = dto.goal || 'personalizado';
    const goalLabel = GOAL_LABELS[goal] || GOAL_LABELS.personalizado;
    const shop = businessName?.trim() || userName;
    const extra = dto.context?.trim() ? `\nDetalhes do barbeiro: ${dto.context.trim()}` : '';

    const system = `Você é um especialista em marketing para barbearias no Brasil.
Crie mensagens curtas para WhatsApp (máx. 320 caracteres cada), tom amigável e profissional, em português do Brasil.
Use emojis com moderação (0-2 por mensagem). Não invente preços se não foram informados.
Responda APENAS com JSON válido: um array de exatamente 3 strings, sem markdown nem texto extra.`;

    const user = `Barbearia/estabelecimento: ${shop}
Objetivo da campanha: ${goalLabel}${extra}

Gere 3 opções de mensagem diferentes para enviar em massa no WhatsApp.`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model(),
        temperature: 0.8,
        max_tokens: 800,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (!res.ok) {
      throw new ServiceUnavailableException(
        `Groq indisponível (${res.status}). Tente novamente em instantes.`,
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new ServiceUnavailableException('A IA não retornou sugestões. Tente de novo.');
    }

    const suggestions = this.parseSuggestions(content);
    if (suggestions.length === 0) {
      throw new ServiceUnavailableException('Não foi possível interpretar as sugestões da IA.');
    }

    return { suggestions: suggestions.slice(0, 3) };
  }

  private parseSuggestions(content: string): string[] {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as unknown;
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item): item is string => typeof item === 'string')
            .map((s) => s.trim())
            .filter(Boolean);
        }
      } catch {
        /* fallback abaixo */
      }
    }

    return content
      .split(/\n+/)
      .map((line) => line.replace(/^\d+[\).\-\s]+/, '').trim())
      .filter((line) => line.length > 20);
  }
}
