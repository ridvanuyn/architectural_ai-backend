const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { TOKEN_PACKAGES, TRANSACTION_TYPES } = require('../config/constants');

// @desc    Get user's token balance
// @route   GET /api/tokens/balance
// @access  Private
exports.getBalance = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        balance: user.tokens.balance,
        totalPurchased: user.tokens.totalPurchased,
        totalUsed: user.tokens.totalUsed,
        subscription: {
          isActive: user.subscription.isActive,
          plan: user.subscription.plan,
          endDate: user.subscription.endDate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available token packages
// @route   GET /api/tokens/packages
// @access  Public
exports.getPackages = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: TOKEN_PACKAGES,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Purchase token package
// @route   POST /api/tokens/purchase
// @access  Private
exports.purchaseTokens = async (req, res, next) => {
  try {
    const { packageId, paymentMethod, transactionId, receiptData } = req.body;

    // Find package
    const tokenPackage = TOKEN_PACKAGES.find(p => p.id === packageId);
    if (!tokenPackage) {
      return res.status(400).json({
        success: false,
        message: 'Invalid package ID',
      });
    }

    // Validate payment (In production, verify with Apple/Google)
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required',
      });
    }

    // Check for duplicate transaction
    const existingTransaction = await Transaction.findOne({
      'payment.transactionId': transactionId,
    });

    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: 'This transaction has already been processed',
      });
    }

    const user = await User.findById(req.user.id);

    // Handle subscription vs one-time purchase
    if (tokenPackage.isSubscription) {
      // Update subscription
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (tokenPackage.period === 'monthly' ? 1 : 12));

      user.subscription = {
        plan: tokenPackage.period === 'monthly' ? 'premium_monthly' : 'premium_yearly',
        startDate: new Date(),
        endDate,
        isActive: true,
        transactionId,
      };

      await user.save();

      // Create subscription transaction
      await Transaction.create({
        user: user._id,
        type: TRANSACTION_TYPES.SUBSCRIPTION,
        tokens: {
          amount: 0,
          balanceBefore: user.tokens.balance,
          balanceAfter: user.tokens.balance,
        },
        payment: {
          amount: tokenPackage.price,
          currency: tokenPackage.currency,
          method: paymentMethod,
          transactionId,
          receiptData,
        },
        package: {
          id: tokenPackage.id,
          name: tokenPackage.name,
        },
        description: `Subscribed to ${tokenPackage.name}`,
      });
    } else {
      // One-time token purchase
      await Transaction.createPurchase(
        user._id,
        { id: tokenPackage.id, name: tokenPackage.name },
        {
          amount: tokenPackage.price,
          currency: tokenPackage.currency,
          method: paymentMethod,
          transactionId,
          receiptData,
        },
        tokenPackage.tokens
      );
    }

    // Fetch updated user
    const updatedUser = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      message: tokenPackage.isSubscription
        ? 'Subscription activated successfully'
        : `${tokenPackage.tokens} tokens added successfully`,
      data: {
        tokens: updatedUser.tokens,
        subscription: updatedUser.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get transaction history
// @route   GET /api/tokens/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type } = req.query;

    const query = { user: req.user.id };
    if (type) query.type = type;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('design', 'style title');

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel subscription
// @route   POST /api/tokens/subscription/cancel
// @access  Private
exports.cancelSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.subscription.isActive) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found',
      });
    }

    // Note: In production, you would also cancel with Apple/Google
    user.subscription.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled. You can continue using until the end of your billing period.',
      data: {
        subscription: user.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify and restore purchases (for app reinstall)
// @route   POST /api/tokens/restore
// @access  Private
exports.restorePurchases = async (req, res, next) => {
  try {
    const { receipts } = req.body;

    if (!receipts || !Array.isArray(receipts)) {
      return res.status(400).json({
        success: false,
        message: 'Receipts array is required',
      });
    }

    // In production, verify each receipt with Apple/Google
    // For now, we'll just return the current state

    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Purchases restored',
      data: {
        tokens: user.tokens,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Grant tokens (e.g. monthly premium bonus)
// @route   POST /api/tokens/grant
// @access  Private
exports.grantTokens = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;
    const grantAmount = parseInt(amount, 10);

    if (!grantAmount || grantAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A positive amount is required',
      });
    }

    const user = await User.findById(req.user.id);
    const balanceBefore = user.tokens.balance;
    user.tokens.balance += grantAmount;
    await user.save();

    await Transaction.create({
      user: user._id,
      type: TRANSACTION_TYPES.BONUS,
      tokens: {
        amount: grantAmount,
        balanceBefore,
        balanceAfter: user.tokens.balance,
      },
      description: reason || 'Premium membership token grant',
    });

    res.status(200).json({
      success: true,
      message: `${grantAmount} tokens granted`,
      data: { tokens: user.tokens },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refund tokens (used when design generation fails)
// @route   POST /api/tokens/refund
// @access  Private
exports.refundTokens = async (req, res, next) => {
  try {
    const { designId, amount, reason } = req.body;
    const refundAmount = parseInt(amount, 10);

    if (!refundAmount || refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A positive amount is required',
      });
    }

    const user = await User.findById(req.user.id);
    const balanceBefore = user.tokens.balance;
    user.tokens.balance += refundAmount;
    // Keep stats consistent — refunded usage shouldn't count as "used".
    if (user.tokens.totalUsed >= refundAmount) {
      user.tokens.totalUsed -= refundAmount;
    }
    await user.save();

    await Transaction.create({
      user: user._id,
      type: TRANSACTION_TYPES.REFUND,
      tokens: {
        amount: refundAmount,
        balanceBefore,
        balanceAfter: user.tokens.balance,
      },
      design: designId || undefined,
      status: 'refunded',
      description: reason || 'Design generation failed — refund',
    });

    res.status(200).json({
      success: true,
      message: `${refundAmount} tokens refunded`,
      data: { tokens: user.tokens },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Apply promo code
// @route   POST /api/tokens/promo
// @access  Private
exports.applyPromoCode = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Promo code is required',
      });
    }

    // In production, validate promo code from database
    // For now, we'll have a simple demo code
    const promoCodes = {
      'WELCOME2024': { tokens: 3, description: 'Welcome bonus' },
      'ARCHITECT50': { tokens: 5, description: '50% extra tokens' },
    };

    const promo = promoCodes[code.toUpperCase()];

    if (!promo) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promo code',
      });
    }

    // Add bonus tokens
    await Transaction.createBonus(req.user.id, promo.tokens, promo.description);

    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      message: `${promo.tokens} bonus tokens added!`,
      data: {
        tokens: user.tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

