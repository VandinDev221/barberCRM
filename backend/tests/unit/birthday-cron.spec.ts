describe('Birthday Cron Date Logic', () => {
  it('should correctly determine today in Brazil (UTC-3) timezone', () => {
    // Supposing current UTC time is 2026-08-17 01:00:00 (which is 2026-08-16 22:00:00 in Brazil)
    const mockUtcTime = new Date('2026-08-17T01:00:00.000Z').getTime();
    
    // Logic from birthday-cron.service.ts:
    const offsetHours = 3; // BARBER_TZ_OFFSET_HOURS
    
    // Current implementation: ADDS offset
    const barberNowIncorrect = new Date(mockUtcTime + offsetHours * 60 * 60 * 1000);
    const dayIncorrect = barberNowIncorrect.getUTCDate();
    const monthIncorrect = barberNowIncorrect.getUTCMonth();
    
    // Correct implementation: SUBTRACTS offset to get local timezone date
    const barberNowCorrect = new Date(mockUtcTime - offsetHours * 60 * 60 * 1000);
    const dayCorrect = barberNowCorrect.getUTCDate();
    const monthCorrect = barberNowCorrect.getUTCMonth();
    
    // Local time in Brazil (UTC-3) at 01:00 UTC on Aug 17 is 22:00 on Aug 16.
    // So the day should be 16 (August is month index 7)
    expect(dayCorrect).toBe(16);
    expect(monthCorrect).toBe(7);
    
    // But the current implementation yields:
    expect(dayIncorrect).toBe(17); // Aug 17 (incorrect)
  });
});
