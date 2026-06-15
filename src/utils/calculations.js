/**
 * Calculates fair bill split with proportional VAT and service charge.
 *
 * @param {Array} items - [{ id, name, quantity, price }]
 * @param {Object} charges - { subtotal, vatAmount, serviceChargeAmount, total }
 * @param {Array} people - [{ id, name, color }]
 * @param {Object} assignments - { itemId: [personId, ...] }
 * @returns {Array} - [{ person, items: [...], itemSubtotal, vatShare, serviceShare, total }]
 */
export function calculateSplit(items, charges, people, assignments) {
  const { subtotal, discount = 0, vatAmount, serviceChargeAmount, isInclusive } = charges;

  // Calculate each person's item subtotal
  const personBreakdowns = people.map((person) => {
    const personItems = [];
    let itemSubtotal = 0;

    items.forEach((item) => {
      const assignedPeople = assignments[item.id] || [];
      if (assignedPeople.includes(person.id)) {
        const splitCount = assignedPeople.length;
        const shareAmount = roundTo2(item.price / splitCount);
        personItems.push({
          ...item,
          splitCount,
          shareAmount,
        });
        itemSubtotal += shareAmount;
      }
    });

    return {
      person,
      items: personItems,
      itemSubtotal: roundTo2(itemSubtotal),
      discountShare: 0,
      vatShare: 0,
      serviceShare: 0,
      total: 0,
    };
  });

  // Calculate the actual sum of all person subtotals (for proportional distribution)
  const totalAssignedSubtotal = personBreakdowns.reduce(
    (sum, b) => sum + b.itemSubtotal,
    0
  );

  // Distribute discount, VAT and service charge proportionally
  if (totalAssignedSubtotal > 0) {
    let discountDistributed = 0;
    let vatDistributed = 0;
    let serviceDistributed = 0;

    personBreakdowns.forEach((breakdown, index) => {
      const proportion = breakdown.itemSubtotal / totalAssignedSubtotal;

      if (index === personBreakdowns.length - 1) {
        // Last person gets the remainder to avoid rounding errors
        breakdown.discountShare = roundTo2(discount - discountDistributed);
        breakdown.vatShare = roundTo2(vatAmount - vatDistributed);
        breakdown.serviceShare = roundTo2(serviceChargeAmount - serviceDistributed);
      } else {
        breakdown.discountShare = roundTo2(discount * proportion);
        breakdown.vatShare = roundTo2(vatAmount * proportion);
        breakdown.serviceShare = roundTo2(serviceChargeAmount * proportion);
        discountDistributed += breakdown.discountShare;
        vatDistributed += breakdown.vatShare;
        serviceDistributed += breakdown.serviceShare;
      }

      if (isInclusive) {
        breakdown.total = roundTo2(breakdown.itemSubtotal - breakdown.discountShare);
      } else {
        breakdown.total = roundTo2(
          breakdown.itemSubtotal - breakdown.discountShare + breakdown.vatShare + breakdown.serviceShare
        );
      }
    });
  }

  return personBreakdowns;
}

/**
 * Generate a shareable text summary of the bill split.
 */
export function generateShareText(breakdowns, charges) {
  let text = '🧾 FairSplit Bill Summary\n';
  text += '━'.repeat(30) + '\n\n';

  breakdowns.forEach((b) => {
    if (b.items.length === 0) return;
    text += `👤 ${b.person.name}\n`;
    b.items.forEach((item) => {
      const splitLabel =
        item.splitCount > 1 ? ` (÷${item.splitCount})` : '';
      text += `   • ${item.name}${splitLabel}: ${b.items[0]?.shareAmount !== undefined ? formatCurrency(item.shareAmount) : formatCurrency(item.price)}\n`;
    });
    text += `   Items: ${formatCurrency(b.itemSubtotal)}`;
    if (b.discountShare > 0) text += ` | Discount: -${formatCurrency(b.discountShare)}`;
    if (b.vatShare > 0) text += ` | VAT: ${formatCurrency(b.vatShare)}`;
    if (b.serviceShare > 0) text += ` | Service: ${formatCurrency(b.serviceShare)}`;
    text += `\n   💰 Total: ${formatCurrency(b.total)}\n\n`;
  });

  text += '━'.repeat(30) + '\n';
  text += `Grand Total: ${formatCurrency(charges.total)}\n`;
  text += '\nSplit with BillKoto ✨';

  return text;
}

function roundTo2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(amount) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
