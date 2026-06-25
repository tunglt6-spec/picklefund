import { Test, TestingModule } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { PrismaService } from '../prisma/prisma.service'
import * as argon2 from 'argon2'

jest.mock('argon2')
const mockArgon2 = argon2 as jest.Mocked<typeof argon2>

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  club: { create: jest.fn() },
  member: { create: jest.fn() },
  $transaction: jest.fn(),
}

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock_token'),
  verify: jest.fn(),
}

const mockConfig = {
  get: jest.fn((key: string) => {
    const vals: Record<string, string> = {
      JWT_SECRET: 'test_secret',
      JWT_REFRESH_SECRET: 'test_refresh_secret',
    }
    return vals[key]
  }),
}

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  describe('login', () => {
    const fakeUser = {
      id: 'user-1',
      username: 'admin',
      passwordHash: 'hashed',
      isActive: true,
      email: 'admin@test.com',
      role: 'CLUB_ADMIN',
      clubId: 'club-1',
      mustChangePassword: false,
      member: null,
    }

    it('should return tokens on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser)
      mockArgon2.verify.mockResolvedValue(true)
      mockPrisma.$transaction.mockResolvedValue([])

      const result = await service.login('admin', 'password123')

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(result.user.username).toBe('admin')
      expect(result.user.clubId).toBe('club-1')
    })

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(service.login('ghost', 'password')).rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException when user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...fakeUser, isActive: false })

      await expect(service.login('admin', 'password')).rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser)
      mockArgon2.verify.mockResolvedValue(false)

      await expect(service.login('admin', 'wrongpass')).rejects.toThrow(UnauthorizedException)
    })
  })
})
