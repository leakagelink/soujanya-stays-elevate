export const ADVANCE_RATE = 0.3;
export const FREE_CANCEL_HOURS = 48;

export const advanceDue = (total: number) => Math.round(total * ADVANCE_RATE);

/** Refund owed when a booking is cancelled: full amount paid if cancelled 48h+ before check-in (14:00), else nothing. */
export function refundDue(paid: number, checkIn: string, cancelledAt: Date): number {
  const checkInAt = new Date(checkIn + "T14:00:00+05:30");
  const hours = (checkInAt.getTime() - cancelledAt.getTime()) / 36e5;
  return hours >= FREE_CANCEL_HOURS ? paid : 0;
}
