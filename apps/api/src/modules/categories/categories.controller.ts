import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CategoriesService } from './categories.service';
import {
  CreateCategoryDto,
  CreateCategoryGroupDto,
  ReorderCategoriesDto,
  ReorderCategoryGroupsDto,
  UpdateCategoryDto,
  UpdateCategoryGroupDto,
} from './dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('groups')
  findAllGroups(@CurrentUser() user: CurrentUserPayload) {
    return this.categoriesService.findAllGroups(user.id);
  }

  /** Lista plana de categorías (sin agrupar). Útil para resolver por nombre. */
  @Get()
  findAllFlat(@CurrentUser() user: CurrentUserPayload) {
    return this.categoriesService.findAllFlat(user.id);
  }

  @Post('groups')
  createGroup(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateCategoryGroupDto,
  ) {
    return this.categoriesService.createGroup(user.id, dto);
  }

  @Patch('groups/reorder')
  reorderGroups(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ReorderCategoryGroupsDto,
  ) {
    return this.categoriesService.reorderGroups(user.id, dto.ids);
  }

  @Patch('groups/:id')
  updateGroup(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryGroupDto,
  ) {
    return this.categoriesService.updateGroup(user.id, id, dto);
  }

  @Delete('groups/:id')
  removeGroup(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.categoriesService.removeGroup(user.id, id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.categoriesService.findOne(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(user.id, dto);
  }

  @Patch('reorder')
  reorderCategories(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ReorderCategoriesDto,
  ) {
    return this.categoriesService.reorderCategories(user.id, dto.ids);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.categoriesService.remove(user.id, id);
  }
}
