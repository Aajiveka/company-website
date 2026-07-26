import { Body, Controller, Get, Headers, HttpCode, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import { CandidatesService } from '@/modules/candidates/candidates.service';
import { PaymentsService } from './payments.service';
import { CreateOrderDto, VerifyPaymentDto } from './dto/payments.dto';

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
  @ApiResponse({ status: 200, description: 'List of active subscription plans' })
  plans() {
    return this.payments.plans();
  }

  // ---------------------------------------------------------------------------
  // Razorpay endpoints
  // ---------------------------------------------------------------------------

  @Post('create-order')
  @ApiBearerAuth()
  @Roles(Role.Subscriber)
  @ApiOperation({ summary: 'Create a Razorpay order for the selected plan' })
  @ApiResponse({ status: 201, description: 'Razorpay order created with checkout details' })
  @ApiResponse({ status: 400, description: 'Razorpay not configured or invalid plan' })
  async createRazorpayOrder(@CurrentUser() user: RequestUser, @Body() dto: CreateOrderDto) {
    const subscriberId = await this.candidates.subscriberIdFor(user.userId);
    return this.payments.createRazorpayOrder(subscriberId, dto.planId);
  }

  @Post('verify')
  @ApiBearerAuth()
  @Roles(Role.Subscriber)
  @ApiOperation({ summary: 'Verify Razorpay payment after checkout completes' })
  @ApiResponse({ status: 200, description: 'Payment verified and subscription activated' })
  @ApiResponse({ status: 400, description: 'Signature verification failed' })
  async verifyPayment(@CurrentUser() user: RequestUser, @Body() dto: VerifyPaymentDto) {
    const subscriberId = await this.candidates.subscriberIdFor(user.userId);
    return this.payments.verifyRazorpayPayment(
      subscriberId,
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Razorpay webhook endpoint (signature-verified, no auth)' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async webhook(
    @Req() req: Request,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const rawBody = typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body);
    return this.payments.handleRazorpayWebhook(rawBody, signature ?? '');
  }

  @Get('history')
  @ApiBearerAuth()
  @Roles(Role.Subscriber)
  @ApiOperation({ summary: 'Payment history for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of past payment orders' })
  async paymentHistory(@CurrentUser() user: RequestUser) {
    const subscriberId = await this.candidates.subscriberIdFor(user.userId);
    return this.payments.paymentHistory(subscriberId);
  }

  // ---------------------------------------------------------------------------
  // Legacy BillDesk endpoints (kept for existing orders)
  // ---------------------------------------------------------------------------

  @Post('orders')
  @ApiBearerAuth()
  @Roles(Role.Subscriber)
  @ApiOperation({ summary: 'Start a payment — returns the BillDesk redirect URL (legacy)' })
  @ApiResponse({ status: 201, description: 'BillDesk order created with redirect URL' })
  async createOrder(@CurrentUser() user: RequestUser, @Body() dto: CreateOrderDto) {
    const subscriberId = await this.candidates.subscriberIdFor(user.userId);
    return this.payments.createOrder(subscriberId, dto.planId);
  }

  @Get('orders/:orderRef')
  @ApiBearerAuth()
  @Roles(Role.Subscriber)
  @ApiOperation({ summary: 'Order status — what the return page displays' })
  @ApiResponse({ status: 200, description: 'Order status details' })
  async orderStatus(@CurrentUser() user: RequestUser, @Param('orderRef') orderRef: string) {
    const subscriberId = await this.candidates.subscriberIdFor(user.userId);
    return this.payments.orderStatus(subscriberId, orderRef);
  }

  @Get('subscription')
  @ApiBearerAuth()
  @Roles(Role.Subscriber)
  @ApiOperation({ summary: "The caller's active subscription, if any" })
  @ApiResponse({ status: 200, description: 'Active subscription or { active: false }' })
  async subscription(@CurrentUser() user: RequestUser) {
    return this.payments.mySubscription(await this.candidates.subscriberIdFor(user.userId));
  }
}
