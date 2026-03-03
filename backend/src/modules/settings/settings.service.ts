import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get(userId: string, key?: string) {
    if (key) {
      const s = await this.prisma.setting.findUnique({
        where: { userId_key: { userId, key } },
      });
      return s ? { key: s.key, value: s.value } : null;
    }
    const list = await this.prisma.setting.findMany({
      where: { userId },
    });
    return list.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>);
  }

  async set(userId: string, key: string, value: string) {
    await this.prisma.setting.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, value },
      update: { value },
    });
    return this.get(userId, key);
  }
}
