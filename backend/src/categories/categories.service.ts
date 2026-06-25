import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  icon?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  icon?: string;
}

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll(clubId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { clubId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  create(clubId: string, dto: CreateCategoryDto) {
    return this.prisma.expenseCategory.create({
      data: { clubId, name: dto.name, icon: dto.icon },
    });
  }

  async update(id: string, clubId: string, dto: UpdateCategoryDto) {
    await this.assertOwner(id, clubId);
    return this.prisma.expenseCategory.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, clubId: string) {
    await this.assertOwner(id, clubId);
    // Unlink expenses first
    await this.prisma.livingExpense.updateMany({
      where: { categoryId: id, clubId },
      data: { categoryId: null },
    });
    return this.prisma.expenseCategory.delete({ where: { id } });
  }

  private async assertOwner(id: string, clubId: string) {
    const cat = await this.prisma.expenseCategory.findFirst({ where: { id, clubId } });
    if (!cat) throw new NotFoundException('Danh mục không tồn tại');
    return cat;
  }
}
