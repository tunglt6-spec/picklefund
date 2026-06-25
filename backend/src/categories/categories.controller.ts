import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { CategoriesService, CreateCategoryDto, UpdateCategoryDto } from './categories.service';
import { CurrentUser, Roles} from '../common/decorators';
import { ok } from '../common/response';

@Controller('categories')
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return ok(this.service.findAll(user.clubId));
  }

  @Post()
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async create(@CurrentUser() user: any, @Body() body: CreateCategoryDto) {
    return ok(await this.service.create(user.clubId, body), 'Tạo danh mục thành công');
  }

  @Patch(':id')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: UpdateCategoryDto) {
    return ok(await this.service.update(id, user.clubId, body), 'Cập nhật thành công');
  }

  @Delete(':id')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.service.remove(id, user.clubId);
    return ok(null, 'Đã xóa danh mục');
  }
}
