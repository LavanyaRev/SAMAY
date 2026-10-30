import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { LoginRequestSchema } from "@samay/shared";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "./current-user.decorator";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("status")
  @ApiOperation({ summary: "Check authentication service status" })
  @ApiResponse({ status: 200, description: "Auth service operational" })
  getStatus() {
    return this.authService.getStatus();
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Authenticate with email and password and receive a signed JWT",
  })
  @ApiResponse({ status: 200, description: "Authenticated and token issued" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() body: unknown) {
    const parsed = LoginRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    return this.authService.login(parsed.data.email, parsed.data.password);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Retrieve authenticated user profile, resolved jurisdiction scope and statutory permissions",
  })
  @ApiResponse({
    status: 200,
    description: "User profile with calculated RBAC permissions",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user);
  }
}
