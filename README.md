# Batloung Farm API

This is the backend code, kept separate from the React frontend in `src/`.

## Setup

1. Install MySQL 8 and run `database/schema.sql` (safe to run again: it never drops data).
2. Copy `.env.example` to `.env` and enter your local MySQL credentials.
3. Run `npm install` inside `backend/`.
4. Run `npm run dev`. The API defaults to `http://localhost:5000`.

The Vite dev server in the repo root proxies `/api` here, so the frontend needs no CORS setup.

The server does not crash when MySQL is unavailable. It remains online and
`GET /api/health` returns a clear `503` response until the connection works.

## Endpoints

| Method         | Endpoint                                             | Purpose                                         |
| -------------- | ---------------------------------------------------- | ----------------------------------------------- |
| GET/POST       | `/api/suppliers`                                     | List or create suppliers                        |
| GET/PUT/DELETE | `/api/suppliers/:id`                                 | Read, update or safely delete a supplier        |
| GET/POST       | `/api/fruits`                                        | List or create fruits                           |
| PUT            | `/api/fruits/:id`                                    | Update fruit details                            |
| GET            | `/api/fruits/stock`                                  | Stock for every fruit and package size          |
| GET            | `/api/fruits/low-stock?threshold=10`                 | Items with stock below the threshold            |
| GET/POST       | `/api/vendors`                                       | Search/list or create vendors                   |
| PUT            | `/api/vendors/:id`                                   | Update a vendor                                 |
| GET/POST       | `/api/purchases`                                     | List purchases, or record one and add stock     |
| GET/POST       | `/api/sales`                                         | List sales, or record one and reduce stock      |
| GET            | `/api/reports/summary?from=2025-01-01&to=2025-12-31` | Top fruits, revenue and top vendor in the range |

## Example sale

```json
{
  "vendorId": 1,
  "paymentStatus": "PARTIALLY_PAID",
  "paymentMethod": "MOBILE_MONEY",
  "amountPaid": 500,
  "items": [
    { "fruitId": 1, "packagingSize": "LARGE", "quantity": 4, "unitPrice": 180 },
    { "fruitId": 3, "packagingSize": "SMALL", "quantity": 3, "unitPrice": 90 }
  ]
}
```

For a sale, `PAID` always records the full total, `UNPAID` must have no `amountPaid`, and
`PARTIALLY_PAID` needs an `amountPaid` above zero and below the total. Purchase items use
`unitCost` (`unitPrice` is also accepted).

The sales model locks all requested stock rows with `FOR UPDATE` before it
creates any records. If even one item lacks stock, `ROLLBACK` rejects the whole
sale, so no stock or partial sale can be left behind.
