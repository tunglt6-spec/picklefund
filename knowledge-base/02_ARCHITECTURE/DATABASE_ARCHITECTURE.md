# Kiến trúc Database PickleFund

**Mục đích:** Mô tả thiết kế database PostgreSQL  
**Đối tượng:** Backend Developer, DBA  
**Cập nhật:** 2026-06-29

---

## Thông tin cơ bản

- **DBMS:** PostgreSQL 16
- **ORM:** TypeORM
- **Multi-tenant strategy:** Shared database, `clubId` column filtering

---

## Các bảng chính

### clubs
```
id (PK)
name
createdAt
updatedAt
```

### users
```
id (PK)
clubId (FK → clubs.id)
email
passwordHash    ← Argon2 hash
role            ← ADMIN | MEMBER
createdAt
```

### members
```
id (PK)
clubId (FK → clubs.id)
name
email
phone
status          ← ACTIVE | INACTIVE
joinedAt
```

### fund_periods
```
id (PK)
clubId (FK)
name
startDate
endDate
status          ← OPEN | CLOSED | FINALIZED
carryForwardBalance   ← Số dư chuyển từ kỳ trước
createdAt
```

### contributions
```
id (PK)
clubId (FK)
fundPeriodId (FK)
memberId (FK)
amount
paidAt
note
```

### expenses
```
id (PK)
clubId (FK)
fundPeriodId (FK)
type            ← COURT | ACTIVITY | OTHER
amount
description
date
```

### mini_funds
```
id (PK)
clubId (FK)
name
balance
createdAt
```

### mini_fund_transactions
```
id (PK)
miniFundId (FK)
type            ← INCOME | EXPENSE
amount
description
date
```

---

## Multi-tenant Isolation

**Mọi query PHẢI có điều kiện `clubId`:**

```typescript
// ĐÚNG
this.repo.find({ where: { clubId: user.clubId } })

// SAI — không có clubId filter
this.repo.find()
```

Backend dùng Guard để đảm bảo `clubId` luôn được inject từ JWT vào mọi request.

---

## Migrations

- Dùng TypeORM migrations
- Không dùng `synchronize: true` trên production
- Migration files: `src/migrations/`

---

## Backup

Xem [05_OPERATIONS/BACKUP.md](../05_OPERATIONS/BACKUP.md) và [07_TROUBLESHOOTING/DATABASE.md](../07_TROUBLESHOOTING/DATABASE.md)
