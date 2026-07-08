/**
 * Prisma Club Memory Repository — persist thật (thay In-Memory, Epic 2.4/V2.2).
 * Giữ nguyên IClubMemoryRepository — service/controller không cần đổi gì.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IClubMemoryRepository } from './club-memory.interfaces';
import { ClubMemoryObject } from './club-memory.types';

type ClubMemoryRow = {
  id: string;
  clubId: string;
  type: string;
  title: string | null;
  content: string;
  tags: string[];
  metadata: Prisma.JsonValue;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toObject(row: ClubMemoryRow): ClubMemoryObject {
  return {
    memoryId: row.id,
    clubId: row.clubId,
    type: row.type as ClubMemoryObject['type'],
    title: row.title,
    content: row.content,
    tags: row.tags,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaClubMemoryRepository implements IClubMemoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(obj: ClubMemoryObject): Promise<ClubMemoryObject> {
    const row = await this.prisma.clubMemory.create({
      data: {
        id: obj.memoryId,
        clubId: obj.clubId,
        type: obj.type,
        title: obj.title,
        content: obj.content,
        tags: [...obj.tags],
        metadata: obj.metadata as Prisma.InputJsonValue,
        createdBy: obj.createdBy,
        updatedBy: obj.updatedBy,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
      },
    });
    return toObject(row);
  }

  async findById(memoryId: string): Promise<ClubMemoryObject | null> {
    const row = await this.prisma.clubMemory.findUnique({
      where: { id: memoryId },
    });
    return row ? toObject(row) : null;
  }

  async replace(obj: ClubMemoryObject): Promise<ClubMemoryObject> {
    const row = await this.prisma.clubMemory.update({
      where: { id: obj.memoryId },
      data: {
        title: obj.title,
        content: obj.content,
        tags: [...obj.tags],
        metadata: obj.metadata as Prisma.InputJsonValue,
        updatedBy: obj.updatedBy,
        updatedAt: obj.updatedAt,
      },
    });
    return toObject(row);
  }

  async deleteById(memoryId: string): Promise<boolean> {
    try {
      await this.prisma.clubMemory.delete({ where: { id: memoryId } });
      return true;
    } catch {
      return false;
    }
  }

  async listByClub(clubId: string): Promise<ClubMemoryObject[]> {
    const rows = await this.prisma.clubMemory.findMany({
      where: { clubId },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(toObject);
  }

  async clear(): Promise<void> {
    await this.prisma.clubMemory.deleteMany({});
  }
}
