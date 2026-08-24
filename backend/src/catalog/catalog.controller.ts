import { Controller, Get, Param } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('public/branches')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get(':slug')
  getBranch(@Param('slug') slug: string) {
    return this.catalog.getBranch(slug);
  }
}
