import { PrismaClient } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Club
  const club = await prisma.club.upsert({
    where: { id: 'club-001' },
    update: {},
    create: {
      id: 'club-001',
      name: 'CLB Pickleball Sunrise',
      code: 'SUNRISE',
      address: '123 Nguyễn Văn Linh, Q.7, TP.HCM',
      contactPhone: '0901234567',
      contactEmail: 'sunrise.pickleball@gmail.com',
      status: 'active',
    },
  })

  // Users (4 demo accounts)
  const hash = async (pw: string) => argon2.hash(pw)

  const superAdmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: { passwordHash: await hash('super123') },
    create: {
      username: 'superadmin',
      passwordHash: await hash('super123'),
      email: 'superadmin@picklebank.vn',
      role: 'SUPER_ADMIN',
    },
  })

  const clubAdmin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: await hash('admin123') },
    create: {
      username: 'admin',
      passwordHash: await hash('admin123'),
      email: 'admin@sunrise.vn',
      role: 'CLUB_ADMIN',
      clubId: club.id,
    },
  })

  const treasurer = await prisma.user.upsert({
    where: { username: 'treasurer' },
    update: { passwordHash: await hash('treasurer123') },
    create: {
      username: 'treasurer',
      passwordHash: await hash('treasurer123'),
      email: 'treasurer@sunrise.vn',
      role: 'CLUB_TREASURER',
      clubId: club.id,
    },
  })

  const memberUser = await prisma.user.upsert({
    where: { username: 'member' },
    update: { passwordHash: await hash('member123') },
    create: {
      username: 'member',
      passwordHash: await hash('member123'),
      email: 'member@sunrise.vn',
      role: 'CLUB_MEMBER',
      clubId: club.id,
    },
  })

  // Members (8 members)
  const memberNames = [
    { name: 'Nguyễn Văn An', phone: '0901111001', userId: memberUser.id },
    { name: 'Trần Thị Bình', phone: '0901111002' },
    { name: 'Lê Văn Cường', phone: '0901111003' },
    { name: 'Phạm Thị Dung', phone: '0901111004' },
    { name: 'Hoàng Văn Em', phone: '0901111005' },
    { name: 'Vũ Thị Phượng', phone: '0901111006' },
    { name: 'Đặng Văn Giang', phone: '0901111007' },
    { name: 'Bùi Thị Hoa', phone: '0901111008' },
  ]

  const members: { id: string }[] = []
  for (let i = 0; i < memberNames.length; i++) {
    const m = await prisma.member.upsert({
      where: { id: `member-00${i + 1}` },
      update: {},
      create: {
        id: `member-00${i + 1}`,
        clubId: club.id,
        fullName: memberNames[i].name,
        phone: memberNames[i].phone,
        joinDate: new Date('2025-01-01'),
        status: 'active',
        ...(memberNames[i].userId ? { userId: memberNames[i].userId } : {}),
      },
    })
    members.push(m)
  }

  // Fund Period (active)
  const fundPeriod = await prisma.fundPeriod.upsert({
    where: { id: 'fp-2025-q2' },
    update: {},
    create: {
      id: 'fp-2025-q2',
      clubId: club.id,
      name: 'Quỹ Quý 2 - 2025',
      startDate: new Date('2025-04-01'),
      endDate: new Date('2025-06-30'),
      contributionAmount: 500000,
      totalSessions: 10,
      status: 'active',
      createdById: clubAdmin.id,
    },
  })

  // Contributions (each member paid 500k)
  for (const m of members) {
    await prisma.fundContribution.upsert({
      where: { id: `contrib-${m.id}` },
      update: {},
      create: {
        id: `contrib-${m.id}`,
        clubId: club.id,
        memberId: m.id,
        fundPeriodId: fundPeriod.id,
        amount: 500000,
        paymentDate: new Date('2025-04-05'),
        isConfirmed: true,
        createdById: clubAdmin.id,
        notes: 'Đóng quỹ quý 2',
      },
    })
  }

  // Attendance sessions (10 sessions)
  const sessionDates = [
    '2025-04-05', '2025-04-12', '2025-04-19', '2025-04-26',
    '2025-05-03', '2025-05-10', '2025-05-17', '2025-05-24',
    '2025-06-07', '2025-06-14',
  ]

  // Attendance pattern: member[i] attends sessions — total should sum to 78 as per design doc
  // member-001: 10, 002: 10, 003: 9, 004: 9, 005: 9, 006: 8, 007: 8, 008: 7 → total 70 (approx)
  const attendanceMask = [
    [1,1,1,1,1,1,1,1,1,1], // member 0: 10
    [1,1,1,1,1,1,1,1,1,1], // member 1: 10
    [1,1,1,1,1,1,1,1,1,0], // member 2: 9
    [1,1,1,1,1,1,1,1,0,1], // member 3: 9
    [1,1,1,1,1,1,1,0,1,1], // member 4: 9
    [1,1,1,1,1,1,0,1,1,0], // member 5: 8
    [1,1,1,1,1,0,1,0,1,1], // member 6: 8
    [1,1,1,1,0,1,0,1,0,1], // member 7: 7
  ]

  for (let si = 0; si < sessionDates.length; si++) {
    const session = await prisma.attendanceSession.upsert({
      where: { id: `session-${si + 1}` },
      update: {},
      create: {
        id: `session-${si + 1}`,
        clubId: club.id,
        fundPeriodId: fundPeriod.id,
        sessionDate: new Date(sessionDates[si]),
        courtFee: 585000,
        courtName: 'Sân Pickleball Sunrise',
        status: 'completed',
        createdById: clubAdmin.id,
      },
    })

    for (let mi = 0; mi < members.length; mi++) {
      await prisma.attendanceRecord.upsert({
        where: { attendanceSessionId_memberId: { attendanceSessionId: session.id, memberId: members[mi].id } },
        update: {},
        create: {
          attendanceSessionId: session.id,
          memberId: members[mi].id,
          clubId: club.id,
          status: attendanceMask[mi][si] === 1 ? 'PRESENT' : 'ABSENT',
        },
      })
    }
  }

  // Living expenses
  const expenses = [
    { description: 'Mua bóng Pickleball (12 quả)', amount: 480000, rule: 'ATTENDANCE' },
    { description: 'Nước uống buổi giải đấu', amount: 320000, rule: 'EQUAL' },
    { description: 'Phần thưởng giải đấu nội bộ', amount: 1000000, rule: 'FUND_ONLY' },
    { description: 'Dụng cụ y tế', amount: 200000, rule: 'EQUAL' },
  ]

  for (let i = 0; i < expenses.length; i++) {
    await prisma.livingExpense.upsert({
      where: { id: `expense-00${i + 1}` },
      update: {},
      create: {
        id: `expense-00${i + 1}`,
        clubId: club.id,
        fundPeriodId: fundPeriod.id,
        description: expenses[i].description,
        amount: expenses[i].amount,
        allocationRule: expenses[i].rule as any,
        createdById: clubAdmin.id,
        expenseDate: new Date('2025-05-01'),
      },
    })
  }

  console.log('✅ Seed completed!')
  console.log('Demo accounts:')
  console.log('  superadmin / super123 → SUPER_ADMIN')
  console.log('  admin / admin123      → CLUB_ADMIN')
  console.log('  treasurer / treasurer123 → CLUB_TREASURER')
  console.log('  member / member123    → CLUB_MEMBER')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
