import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PriceCatalogItem } from "../persistence/entities";
import { requireNonNegativeNumber, requireString } from "../common/validation";

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PriceCatalogItem)
    private readonly prices: Repository<PriceCatalogItem>,
  ) {}

  listPrices() {
    return this.prices.find({ order: { label: "ASC" } });
  }

  async upsertPrice(input: { label: string; unitPrice: number; unit?: string }) {
    const label = requireString(input.label, "label");
    const unitPrice = requireNonNegativeNumber(input.unitPrice, "unitPrice");
    const existing = await this.prices.findOne({ where: { label } });
    const item = existing ?? this.prices.create({ label });
    item.unitPrice = unitPrice;
    item.unit = input.unit ?? item.unit ?? "each";
    return this.prices.save(item);
  }

  /** Returns a `label -> unitPrice` map used by budget recalculation. */
  async getPriceMap(): Promise<Map<string, number>> {
    const prices = await this.prices.find();
    return new Map(prices.map((price) => [price.label, price.unitPrice]));
  }
}
