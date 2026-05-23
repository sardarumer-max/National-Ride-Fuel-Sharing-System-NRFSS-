/**
 * Pure fuel cost calculations
 */
export function calcFuelCost(distance, efficiency, pricePerLiter, passengers = 1) {
  if (!distance || !efficiency || !pricePerLiter) return null
  const liters = distance / efficiency
  const total = liters * pricePerLiter
  const perPerson = total / (passengers + 1) // +1 for driver
  return {
    totalCost: Math.round(total),
    costPerPassenger: Math.round(perPerson),
    liters: parseFloat(liters.toFixed(2)),
    people: passengers + 1,
  }
}

export const FUEL_PRICES = { petrol: 295, diesel: 290, cng: 165 }

export function formatPKR(amount) {
  return `PKR ${Number(amount || 0).toLocaleString('en-PK')}`
}

export function getInitials(name) {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}
