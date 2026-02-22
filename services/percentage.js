// Formatting function used across services and UI
const proFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
});

// Percentage Logic
function calculateRowResult(type, x, y) {
    let resText = '0.00';
    if (x === null || y === null || isNaN(x) || isNaN(y)) {
        return (type === 'type1' || type === 'type3') ? '0.00%' : '0.00';
    }

    switch (type) {
        case 'type1':
            if (y !== 0) resText = proFormatter.format((x / y) * 100) + '%';
            else resText = '0.00%';
            break;
        case 'type2':
            resText = proFormatter.format((x / 100) * y);
            break;
        case 'type3':
            if (x !== 0) {
                const res = ((y - x) / Math.abs(x)) * 100;
                const sign = res > 0 ? '+' : '';
                resText = sign + proFormatter.format(res) + '%';
            } else resText = '0.00%';
            break;
        case 'type4':
            if (y !== 0) resText = proFormatter.format(x / (y / 100));
            else resText = '0.00';
            break;
    }
    return resText;
}
