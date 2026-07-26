import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { CompaniesService } from './companies.service';

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search companies by name' })
  search(@Query('q') q: string) {
    return this.companies.search(q ?? '');
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Company detail by ID' })
  byId(@Param('id', ParseIntPipe) id: number) {
    return this.companies.byId(id);
  }
}
