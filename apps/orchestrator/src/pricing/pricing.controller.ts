import { Body, Controller, Get, Post } from "@nestjs/common";
import { PricingService } from "./pricing.service";

@Controller("price-catalog")
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  list() {
    return this.pricing.listPrices();
  }

  @Post()
  upsert(@Body() body: { label: string; unitPrice: number; unit?: string }) {
    return this.pricing.upsertPrice(body);
  }
}
