import { prisma } from '../lib/prisma.js';
import { AppError } from '../errors/app-error.js';

interface RawLotStats {
  lotId: number;
  lotName: string;
  price: string | number;
  quantity: number;
  soldTickets: bigint | number;
  checkedInTickets: bigint | number;
}

export async function getEventOccupancy(eventId: number, userId: number, userRole: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, capacity: true, organizerId: true },
  });

  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Evento não encontrado.');
  }

  if (userRole !== 'ADMIN' && event.organizerId !== userId) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Apenas o organizador dono do evento pode visualizar a ocupação.',
    );
  }

  // RN-10: Agregações executadas diretamente no banco via SQL
  const rawLotsStats = await prisma.$queryRaw<RawLotStats[]>`
    SELECT 
      tl.id AS lotId,
      tl.name AS lotName,
      tl.price AS price,
      tl.quantity AS quantity,
      COALESCE(SUM(CASE WHEN t.status IN ('VALID', 'USED') THEN 1 ELSE 0 END), 0) AS soldTickets,
      COALESCE(SUM(CASE WHEN t.status = 'USED' THEN 1 ELSE 0 END), 0) AS checkedInTickets
    FROM ticket_lots tl
    LEFT JOIN tickets t ON t.lot_id = tl.id
    WHERE tl.event_id = ${eventId}
    GROUP BY tl.id, tl.name, tl.price, tl.quantity
    ORDER BY tl.id ASC
  `;

  let totalLotsQuantity = 0;
  let totalSold = 0;
  let totalCheckedIn = 0;
  let totalRevenueNum = 0;

  const lots = rawLotsStats.map((item) => {
    const sold = Number(item.soldTickets);
    const checkedIn = Number(item.checkedInTickets);
    const qty = Number(item.quantity);
    const priceNum = Number(item.price);
    const available = Math.max(0, qty - sold);
    const occupancyRate = qty > 0 ? Math.round((sold / qty) * 10000) / 100 : 0;

    totalLotsQuantity += qty;
    totalSold += sold;
    totalCheckedIn += checkedIn;
    totalRevenueNum += sold * priceNum;

    return {
      lotId: Number(item.lotId),
      lotName: item.lotName,
      price: priceNum.toFixed(2),
      quantity: qty,
      sold,
      checkedIn,
      available,
      occupancyRate,
    };
  });

  const eventCapacity = Number(event.capacity);
  const occupancyRate =
    eventCapacity > 0 ? Math.round((totalSold / eventCapacity) * 10000) / 100 : 0;
  const checkinRate = totalSold > 0 ? Math.round((totalCheckedIn / totalSold) * 10000) / 100 : 0;

  return {
    eventId: event.id,
    title: event.title,
    capacity: eventCapacity,
    totalLotsQuantity,
    soldTickets: totalSold,
    checkedInTickets: totalCheckedIn,
    totalRevenue: totalRevenueNum.toFixed(2),
    occupancyRate,
    checkinRate,
    lots,
  };
}
