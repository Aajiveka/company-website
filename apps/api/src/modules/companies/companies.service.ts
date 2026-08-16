import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  async search(q: string) {
    const rows = await this.db.clientMstr.findMany({
      where: q ? { clientName: { contains: q, mode: 'insensitive' } } : {},
      take: 20,
      orderBy: { clientName: 'asc' },
      include: {
        city: { select: { descr: true } },
        industryType: { select: { industryType: true } },
      },
    });

    return rows.map((c) => ({
      clientId: Number(c.clientID),
      clientName: c.clientName ?? '',
      industry: c.industryType?.industryType ?? '',
      city: c.city?.descr ?? '',
      logoUrl: c.companyLogo?.trim() ? `/api/clients/${Number(c.clientID)}/logo` : null,
    }));
  }

  async byId(id: number) {
    const c = await this.db.clientMstr.findUnique({
      where: { clientID: id },
      include: {
        city: { select: { descr: true } },
        industryType: { select: { industryType: true } },
      },
    });
    if (!c) throw new NotFoundException('Company not found');

    const activeJobs = await this.db.clientJobs.count({
      where: { clientID: c.clientID, statusID: 1 },
    });

    return {
      clientId: Number(c.clientID),
      clientName: c.clientName ?? '',
      industry: c.industryType?.industryType ?? '',
      email: c.emailID ?? '',
      contactNo: c.contactNo ?? '',
      website: c.companyWebsite ?? '',
      city: c.city?.descr ?? '',
      address: c.clientAddress ?? '',
      logoUrl: c.companyLogo?.trim() ? `/api/clients/${Number(c.clientID)}/logo` : null,
      description: c.companyDescr ?? '',
      activeJobs,
    };
  }
}
