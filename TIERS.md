# FIRE Station — Subscription Tiers

## Tier Definitions

### Starter — Free
| Feature | Included |
|---|---|
| Client profiles | **3 max** |
| FIRE planning & calculations | ✅ |
| Scenario planning (What-If) | ✅ |
| Family impact panel | ✅ |
| PDF export | ✅ |
| JSON export (data portability) | ✅ Always free — PDPA |
| Advisor Dashboard (`/dashboard`) | ❌ |
| Presentation mode | ❌ |
| Insights panel | ❌ |
| Team features | ❌ |

### Pro — SGD 59/month · SGD 49/month billed annually (SGD 590/year)
| Feature | Included |
|---|---|
| Client profiles | **Unlimited** |
| Everything in Starter | ✅ |
| Advisor Dashboard (`/dashboard`) | ✅ |
| Presentation mode | ✅ |
| Insights panel | ✅ |
| Team features | ❌ |

### Team — SGD 149/month · SGD 124/month billed annually (SGD 1,490/year)
Manager pays this tier. Each advisor under them pays Pro separately.

| Feature | Included |
|---|---|
| Everything in Pro | ✅ |
| Manager Dashboard (`/team`) | ✅ |
| Invite & manage advisors | ✅ |
| Team client overview | ✅ |

---

## Stripe Product IDs (fill in after creating in Stripe dashboard)

| Tier | Billing | Stripe Price ID |
|---|---|---|
| Pro | Monthly | `price_` |
| Pro | Annual | `price_` |
| Team | Monthly | `price_` |
| Team | Annual | `price_` |

---

## Feature Gate Reference (for 2C implementation)

| Gate | Starter | Pro | Team |
|---|---|---|---|
| `maxProfiles` | 3 | Unlimited | Unlimited |
| `advisorDashboard` | ❌ | ✅ | ✅ |
| `presentationMode` | ❌ | ✅ | ✅ |
| `insightsPanel` | ❌ | ✅ | ✅ |
| `managerDashboard` | ❌ | ❌ | ✅ |
| `teamInvites` | ❌ | ❌ | ✅ |

---

## Pricing Notes
- All prices shown ex-GST
- "Most Popular" badge on Pro tier
- Lead with monthly billing at launch; surface annual upgrade prompt after 60–90 days
- SGD 59/month is under 1% of median FA monthly income — no finance sign-off needed
- Advisors under a Team manager each need their own Pro subscription
