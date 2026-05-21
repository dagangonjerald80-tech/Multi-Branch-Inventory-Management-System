"""Server-side inventory assistant (aligned with web Chatbot.jsx intents)."""
import re
from django.db import models as dj_models


def build_reply(user_text, api_client_callables):
    """
    api_client_callables: dict of callables with keys:
      dashboard_get, stocks_low, branches_list, products_list, transfers_list, history_list
    """
    t = user_text.lower().strip()
    if not t:
        return 'Mag-type ng mensahe.'

    if re.match(r'^(hi|hello|kamusta|hey|magandang)\b', t) or re.match(
        r'^good\s+(morning|afternoon|evening)\b', t
    ):
        return (
            'Kamusta! Ako ang **Inventory Assistant**. Tanungin mo ako tungkol sa '
            'dashboard, low stock, branches, products, transfers, o history. I-type ang **tulong** para sa listahan.'
        )

    if re.search(r'tulong|help|commands|mga\s+tanong|ano\s+ang\s+maire', t):
        return (
            '**Inventory Assistant**\n\nHalimbawa ng tanong:\n'
            '• **dashboard** o **buod** — buod ng stats\n'
            '• **low stock** o **mababang stock**\n'
            '• **branches** o **sangay**\n'
            '• **products** o **produkto**\n'
            '• **transfers** o **lipat** (pending)\n'
            '• **history** o **kasaysayan**\n'
            '• **suppliers** o **supplier ng <produkto>**\n'
            '• **stock ng <produkto>** o **ilan ang <produkto>**\n\n'
            'English o Tagalog — pareho pwede.'
        )

    if re.search(r'dashboard|buod|overview|stats|estadistika|summary', t):
        d = api_client_callables['dashboard_get']()
        s = d['stats']
        lines = [
            '**Dashboard (live)**',
            f"• Products: **{s['total_products']}**",
            f"• Branches: **{s['total_branches']}**",
            f"• Total inventory (units): **{s['total_inventory']}**",
            f"• Low stock alerts: **{s['low_stock_alerts']}**",
            f"• Pending transfers: **{s['active_transfers']}**",
        ]
        if d.get('stock_by_branch'):
            lines.extend(['', '**Stock ayon sa branch:**'])
            for b in d['stock_by_branch']:
                lines.append(f"• {b['name']}: **{b['value']}**")
        low = d.get('low_stock_items') or []
        if low:
            lines.extend(['', '**Sample low stock:**'])
            for x in low[:5]:
                lines.append(
                    f"• {x.get('product_name')} ({x.get('branch_name')}): **{x.get('quantity')}** / "
                    f"threshold {x.get('low_stock_threshold')}"
                )
        lines.extend(['', 'Buksan ang pahina: sidebar → **Dashboard**.'])
        return '\n'.join(lines)

    if re.search(r'low\s*stock|mababa(ng)?\s+stock|kulang\s+ang|bababa\s+ang|naubos', t):
        items = api_client_callables['stocks_low']()
        if not items:
            return 'Walang low stock records ngayon.'
        lines = [f'**{len(items)}** low stock record(s):', '']
        for x in items[:15]:
            lines.append(
                f"• **{x.get('product_name')}** — {x.get('branch_name')}: qty **{x.get('quantity')}**, "
                f"threshold **{x.get('low_stock_threshold')}**"
            )
        if len(items) > 15:
            lines.extend(['', f'…at **{len(items) - 15}** pa. Tingnan ang **Low Stock** sa sidebar.'])
        return '\n'.join(lines)

    if re.search(r'\bbranch|sangay|tindahan\b', t) and not re.search(r'stock\s+by', t):
        branches = api_client_callables['branches_list']()
        if not branches:
            return 'Walang naka-listang branch.'
        lines = [f'**{len(branches)}** branch(es):', '']
        for b in branches:
            lines.append(f"• **{b['name']}** (id {b['id']})")
        lines.extend(['', 'Sidebar → **Branches** para mag-edit.'])
        return '\n'.join(lines)

    if re.search(r'\bproduct|produkto|sku\b', t):
        products = api_client_callables['products_list']()
        if not products:
            return 'Walang produkto.'
        lines = [f'**{len(products)}** produkto:', '']
        for p in products[:12]:
            lines.append(f"• **{p['name']}** — SKU {p.get('sku') or '—'}")
        if len(products) > 12:
            lines.extend(['', f'…at **{len(products) - 12}** pa. **Products** sa sidebar.'])
        return '\n'.join(lines)

    if re.search(r'transfer|lipat|pending', t):
        transfers = api_client_callables['transfers_list']()
        if not transfers:
            return 'Walang transfer records.'
        pending = [x for x in transfers if x.get('status') == 'PENDING']
        lines = [f'**{len(transfers)}** transfer(s) lahat; **{len(pending)}** pending.', '']
        for tr in pending[:8]:
            lines.append(
                f"• #**{tr['id']}** {tr.get('product_name')}: {tr.get('from_branch_name')} → "
                f"{tr.get('to_branch_name')} (qty **{tr.get('quantity')}**)"
            )
        if len(pending) > 8:
            lines.extend(['', f'…at **{len(pending) - 8}** pang pending.'])
        if not pending:
            lines.append('Walang pending; lahat tapos o cancelled.')
        lines.extend(['', 'Sidebar → **Transfers**.'])
        return '\n'.join(lines)

    if re.search(r'history|kasaysayan|galaw|movement|log\b', t):
        rows = api_client_callables['history_list']()
        if not rows:
            return 'Walang history entries.'
        lines = ['**Huling galaw (hanggang 8):**', '']
        for h in rows[:8]:
            lines.append(
                f"• **{h.get('movement_type')}** — {h.get('product_name')} @ {h.get('branch_name')}: "
                f"**{h.get('quantity')}**"
            )
        lines.extend(['', 'Sidebar → **History** para sa buong listahan.'])
        return '\n'.join(lines)

    if re.search(r'supplier', t):
        # Extract product if "supplier ng X"
        prod_match = re.search(r'supplier ng ([\w\s]+)', t)
        if prod_match:
            prod_name = prod_match.group(1).strip()
            products = api_client_callables['products_list']()
            matched = [p for p in products if prod_name in p['name'].lower()]
            if not matched:
                return f"Walang nahanap na produktong '{prod_name}'."
            lines = [f"**Supplier ng '{prod_name}':**", ""]
            for m in matched:
                lines.append(f"• **{m['name']}**: {m.get('supplier_name') or 'Walang nakalagay na supplier'}")
            return '\n'.join(lines)
        else:
            sups = api_client_callables['suppliers_list']()
            if not sups:
                return 'Walang naka-register na suppliers.'
            lines = [f"**{len(sups)}** Suppliers:", ""]
            for s in sups[:10]:
                lines.append(f"• **{s['name']}** (Contact: {s.get('contact_person') or 'N/A'}, {s.get('phone') or 'N/A'})")
            return '\n'.join(lines)

    # Specific product stock query: "stock ng kalabasa" or "pila ang stock sa mangga"
    stock_match = re.search(r'(?:stock ng|stock sa|ilan ang|pila ang|ilang)\s+([\w\s]+)', t)
    if stock_match and not re.search(r'low\s*stock|mababa', t):
        prod_name = stock_match.group(1).strip().replace('stock', '').strip()
        if prod_name:
            all_stocks = api_client_callables['stocks_all']()
            matched_stocks = [s for s in all_stocks if prod_name in s['product_name'].lower()]
            if not matched_stocks:
                return f"Walang stock record para sa '{prod_name}' o baka mali ang spelling."
            
            lines = [f"**Stock para sa '{prod_name}':**", ""]
            total = 0
            for s in matched_stocks:
                lines.append(f"• {s['branch_name']}: **{s['quantity']}** units")
                total += s['quantity']
            lines.extend(["", f"**Total:** {total} units"])
            return '\n'.join(lines)

    return (
        'Hindi ko sigurado ang tanong. Subukan: **tulong**, **dashboard**, **low stock**, '
        '**branches**, **products**, **suppliers**, **transfers**, o **history**.'
    )


def dashboard_stats_payload():
    from .models import Branch, Product, Stock, StockTransfer, StockMovementHistory
    from .serializers import (
        StockSerializer,
        StockMovementHistorySerializer,
    )
    from django.utils import timezone
    from datetime import timedelta

    total_products = Product.objects.count()
    total_branches = Branch.objects.count()
    total_inventory = Stock.objects.aggregate(total=dj_models.Sum('quantity'))['total'] or 0
    low_stock_alerts = Stock.objects.filter(quantity__lte=dj_models.F('low_stock_threshold')).count()
    active_transfers = StockTransfer.objects.filter(status='PENDING').count()

    stock_by_branch = []
    for branch in Branch.objects.all():
        branch_stock = Stock.objects.filter(branch=branch).aggregate(total=dj_models.Sum('quantity'))['total'] or 0
        stock_by_branch.append({'name': branch.name, 'value': branch_stock})

    recent_history = StockMovementHistory.objects.all().order_by('-date')[:5]
    activities = StockMovementHistorySerializer(recent_history, many=True).data

    low_stock_items = StockSerializer(
        Stock.objects.filter(quantity__lte=dj_models.F('low_stock_threshold')),
        many=True,
    ).data

    trend = []
    end_date = timezone.now()
    for i in range(6, -1, -1):
        date = end_date - timedelta(days=i)
        count = (
            StockMovementHistory.objects.filter(movement_type='SALE', date__date=date.date()).aggregate(
                total=dj_models.Sum('quantity')
            )['total']
            or 0
        )
        trend.append({'date': date.strftime('%b %d'), 'sales': count})

    return {
        'stats': {
            'total_products': total_products,
            'total_branches': total_branches,
            'total_inventory': total_inventory,
            'low_stock_alerts': low_stock_alerts,
            'active_transfers': active_transfers,
        },
        'stock_by_branch': stock_by_branch,
        'recent_activities': activities,
        'low_stock_items': low_stock_items,
        'sales_trend': trend,
    }
