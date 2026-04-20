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

## Stripe Price IDs (Test mode)

| Tier | Billing | Amount | Stripe Price ID |
|---|---|---|---|
| Pro | Monthly | SGD 59 | `price_1TOLYyKQ4OjU0R9eXyO9p85H` |
| Pro | Annual | SGD 590 | `price_1TOLZDKQ4OjU0R9ey7JlCVHA` |
| Team | Monthly | SGD 149 | `price_1TOLZdKQ4OjU0R9egp11z5gX` |
| Team | Annual | SGD 1,490 | `price_1TOLZuKQ4OjU0R9e1aYCnGvk` |

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
