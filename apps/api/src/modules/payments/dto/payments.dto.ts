import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ description: 'tblSubscriptionPlan.PlanID' })
  @IsInt()
  @Min(1)
  planId!: number;

  // Deliberately NO amount. The price is read from the plan — a client that could name its
  // own amount could buy a 1499 plan for 1 rupee.
}

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Razorpay order ID returned by createOrder' })
  @IsString()
  razorpayOrderId!: string;

  @ApiProperty({ description: 'Razorpay payment ID from checkout callback' })
  @IsString()
  razorpayPaymentId!: string;

  @ApiProperty({ description: 'HMAC-SHA256 signature from checkout callback' })
  @IsString()
  razorpaySignature!: string;
}
