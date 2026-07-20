import { Body, Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import { CandidatesService } from '@/modules/candidates/candidates.service';
import { PaymentsService } from './payments.service';
import { CreateOrderDto } from './dto/payments.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly candidates: CandidatesService,
  ) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Subscription plans' })
  plans() {
    return this.payments.plans();
  }

  @Post('orders')
  @ApiBearerAuth()
  @Roles(Role.Subscriber)
  @ApiOperation({ summary: 'Start a payment — returns the BillDesk redirect URL' })
  async createOrder(@CurrentUser() user: RequestUser, @Body() dto: CreateOrderDto) {
    const subscriberId = await this.candidates.subscriberIdFor(user.userId);
    return this.payments.createOrder(subscriberId, dto.planId);
  }

  @Get('orders/:orderRef')
  @ApiBearerAuth()
  @Roles(Role.Subscriber)
  @ApiOperation({ summary: 'Order status — what the return page displays' })
  async orderStatus(@CurrentUser() user: RequestUser, @Param('orderRef') orderRef: string) {
    const subscriberId = await this.candidates.subscriberIdFor(user.userId);
    return this.payments.orderStatus(subscriberId, orderRef);
  }

  @Get('subscription')
  @ApiBearerAuth()
  @Roles(Role.Subscriber)
  @ApiOperation({ summary: 'The caller’s active subscription, if any' })
  async subscription(@CurrentUser() user: RequestUser) {
    return this.payments.mySubscription(await this.candidates.subscriberIdFor(user.userId));
  }

  /**
   * BillDesk's server-to-server callback. Public because BillDesk has no bearer token — the
   * JWS signature IS the authentication, and it is verified before the payload is read.
   *
   * This is the ONLY thing that activates a subscription. The browser redirect is not
   * trusted: it arrives through the user's own browser, so treating it as proof of payment
   * would let anyone mark their own order paid.
   */
  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'BillDesk transaction callback (JWS-signed)' })
  async webhook(@Req() req: Request) {
    const body = typeof req.body === 'string' ? req.body : String(req.body?.transaction_response ?? '');
    return this.payments.settle(body);
  }
}
