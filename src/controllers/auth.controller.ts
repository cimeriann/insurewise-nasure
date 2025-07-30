import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { User } from "@/models/User";
import { Wallet } from "@/models/Wallet";
import { generateTokens } from "@/middleware/auth";
import { catchAsync, AppError } from "@/middleware/errorHandler";
import { logger } from "@/config/logger";
import { AuthenticatedRequest, ApiResponse } from "@/types";

/**
 * Register a new user
 */
export const register = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
	logger.info("Registration Service started")
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation failed", 400));
    }

    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth,
      address,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phoneNumber }],
    });

    if (existingUser) {
      return next(
        new AppError("User with this email or phone number already exists", 409)
      );
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      address,
    });

    await user.save();

    // Create wallet for the user
    const wallet = new Wallet({
      userId: user._id,
      balance: parseFloat(process.env.DEFAULT_WALLET_BALANCE || "0"),
      currency: "NGN",
    });

    await wallet.save();

    // Generate tokens
    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } = generateTokens(tokenPayload);

    // Log successful registration
    logger.info("User registered successfully", {
      userId: user._id,
      email: user.email,
      phoneNumber: user.phoneNumber,
    });

    // Remove password from response
    const userResponse = user.toJSON();

    const response: ApiResponse = {
      status: "success",
      message: "User registered successfully",
      data: {
        user: userResponse,
        wallet: {
          id: wallet._id,
          balance: wallet.balance,
          currency: wallet.currency,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    };

    res.status(201).json(response);
  }
);

/**
 * Login user
 */
export const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation failed", 400));
    }

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    if (!user) {
      return next(new AppError("Invalid email or password", 401));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(new AppError("Account has been deactivated", 401));
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return next(new AppError("Invalid email or password", 401));
    }

    // Get user's wallet
    const wallet = await Wallet.findOne({ userId: user._id, isActive: true });

    // Generate tokens
    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } = generateTokens(tokenPayload);

    // Log successful login
    logger.info("User logged in successfully", {
      userId: user._id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    // Remove password from response
    const userResponse = user.toJSON();

    const response: ApiResponse = {
      status: "success",
      message: "Login successful",
      data: {
        user: userResponse,
        wallet: wallet
          ? {
              id: wallet._id,
              balance: wallet.balance,
              currency: wallet.currency,
            }
          : null,
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    };

    res.status(200).json(response);
  }
);

/**
 * Refresh access token
 */
export const refreshToken = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("User not found in request", 401));
    }

    // Generate new tokens
    const tokenPayload = {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    };

    const { accessToken, refreshToken: newRefreshToken } =
      generateTokens(tokenPayload);

    const response: ApiResponse = {
      status: "success",
      message: "Token refreshed successfully",
      data: {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken,
        },
      },
    };

    res.status(200).json(response);
  }
);

/**
 * Logout user (client-side token invalidation)
 */
export const logout = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Log logout
    if (req.user) {
      logger.info("User logged out", {
        userId: req.user.id,
        email: req.user.email,
        ip: req.ip,
      });
    }

    const response: ApiResponse = {
      status: "success",
      message: "Logged out successfully",
    };

    res.status(200).json(response);
  }
);

/**
 * Get current user profile
 */
export const getCurrentUser = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("User not found in request", 401));
    }

    // Get user details
    const user = await User.findById(req.user.id).populate("savingsPlans");
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Get user's wallet
    const wallet = await Wallet.findOne({ userId: user._id, isActive: true });

    const response: ApiResponse = {
      status: "success",
      message: "User profile retrieved successfully",
      data: {
        user: user.toJSON(),
        wallet: wallet
          ? {
              id: wallet._id,
              balance: wallet.balance,
              currency: wallet.currency,
            }
          : null,
      },
    };

    res.status(200).json(response);
  }
);

/**
 * Change password
 */
export const changePassword = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation failed", 400));
    }

    if (!req.user) {
      return next(new AppError("User not found in request", 401));
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return next(new AppError("Current password is incorrect", 400));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log password change
    logger.info("Password changed successfully", {
      userId: user._id,
      email: user.email,
      ip: req.ip,
    });

    const response: ApiResponse = {
      status: "success",
      message: "Password changed successfully",
    };

    res.status(200).json(response);
  }
);

/**
 * Request password reset (placeholder for future implementation)
 */
export const requestPasswordReset = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>>> => {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal whether user exists or not
      const response: ApiResponse = {
        status: "success",
        message:
          "If an account with that email exists, a password reset link has been sent",
      };
      return res.status(200).json(response);
    }

    // TODO: Implement email sending for password reset
    logger.info("Password reset requested", {
      userId: user._id,
      email: user.email,
      ip: req.ip,
    });

    const response: ApiResponse = {
      status: "success",
      message:
        "If an account with that email exists, a password reset link has been sent",
    };

    return res.status(200).json(response);
  }
);
