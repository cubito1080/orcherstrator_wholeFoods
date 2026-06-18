import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { Repository } from "typeorm";
import { Tenant, User } from "../persistence/entities";
import { requireString } from "../common/validation";
import type { AuthUser } from "./auth.types";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    private readonly jwt: JwtService,
  ) {}

  async register(input: { email: string; password: string; tenantName?: string }) {
    const email = requireString(input.email, "email").toLowerCase();
    const password = requireString(input.password, "password");

    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException("email already registered");
    }

    const tenant = await this.tenants.save(
      this.tenants.create({ name: input.tenantName?.trim() || "Default Tenant" }),
    );
    const user = await this.users.save(
      this.users.create({
        email,
        passwordHash: await bcrypt.hash(password, 12),
        tenant,
      }),
    );
    return this.issueToken(user);
  }

  async login(input: { email: string; password: string }) {
    const email = requireString(input.email, "email").toLowerCase();
    const password = requireString(input.password, "password");

    const user = await this.users.findOne({ where: { email }, relations: { tenant: true } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException("invalid credentials");
    }
    return this.issueToken(user);
  }

  private issueToken(user: User) {
    const payload: AuthUser = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenant?.id ?? null,
    };
    return {
      accessToken: this.jwt.sign(payload),
      user: { id: user.id, email: user.email, tenantId: payload.tenantId },
    };
  }
}
