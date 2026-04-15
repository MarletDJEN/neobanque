import { Router } from 'express';
import * as authCtl from '../controllers/auth.controller.js';
import * as meCtl from '../controllers/me.controller.js';
import * as clientCtl from '../controllers/client.controller.js';
import * as adminCtl from '../controllers/admin.controller.js';
import * as activationCtl from '../controllers/activation.controller.js';
import { authMiddleware } from '../middlewares/auth.js';
import { adminMiddleware } from '../middlewares/admin.js';

const router = Router();

router.post('/register', authCtl.register);
router.post('/login', authCtl.login);

router.get('/me', authMiddleware, meCtl.getMe);

router.get('/modal-message', authMiddleware, activationCtl.getModalMessage);

router.post('/withdraw', authMiddleware, clientCtl.withdraw);
router.post('/withdrawal-request', authMiddleware, clientCtl.createWithdrawalRequest);
router.get('/withdrawal-requests/my-requests', authMiddleware, clientCtl.getMyWithdrawalRequests);
router.post('/withdrawal-code/validate', authMiddleware, clientCtl.validateWithdrawalCode);
router.post('/withdrawal-complete', authMiddleware, clientCtl.completeWithdrawal);
router.post('/transfer', authMiddleware, clientCtl.transfer);
router.get('/transactions', authMiddleware, clientCtl.getTransactions);
router.post('/request-iban', authMiddleware, clientCtl.requestIban);
router.post('/request-card', authMiddleware, clientCtl.requestCard);
router.post('/request-account-activation', authMiddleware, clientCtl.requestAccountActivation);
router.post('/card/block', authMiddleware, clientCtl.blockOwnCard);
router.patch('/profile', authMiddleware, clientCtl.updateProfile);
router.post('/kyc/submit', authMiddleware, clientCtl.submitKyc);
router.patch('/notifications/:id/read', authMiddleware, clientCtl.markNotificationRead);
router.post('/notifications/read-all', authMiddleware, clientCtl.markAllNotificationsRead);
router.delete('/notifications/:id', authMiddleware, clientCtl.deleteNotification);

router.get('/admin/data', authMiddleware, adminMiddleware, adminCtl.listAllData);
router.get('/admin/users', authMiddleware, adminMiddleware, adminCtl.listUsers);
router.get('/admin/users/activation', authMiddleware, adminMiddleware, adminCtl.listUsersForActivation);
router.post('/admin/users/:id/verify', authMiddleware, adminMiddleware, adminCtl.verifyUser);
router.post('/admin/users/:id/status', authMiddleware, adminMiddleware, adminCtl.setUserStatus);
router.post('/admin/users/:id/iban', authMiddleware, adminMiddleware, adminCtl.assignIban);
router.post('/admin/kyc/:id/approve', authMiddleware, adminMiddleware, adminCtl.approveKyc);
router.post('/admin/kyc/:id/reject', authMiddleware, adminMiddleware, adminCtl.rejectKyc);
router.post('/admin/users/:id/kyc-quick', authMiddleware, adminMiddleware, adminCtl.approveKyc);
router.post('/admin/users/:userId/card/activate', authMiddleware, adminMiddleware, adminCtl.activateCard);
router.post('/admin/users/:userId/card/block', authMiddleware, adminMiddleware, adminCtl.blockCardAdmin);
router.post('/admin/users/:id/deposit', authMiddleware, adminMiddleware, adminCtl.adminDeposit);
router.post('/admin/users/:id/withdraw', authMiddleware, adminMiddleware, adminCtl.adminWithdraw);

// Routes pour les demandes d'activation de compte
router.get('/admin/activation-requests', authMiddleware, adminMiddleware, activationCtl.listActivationRequests);
router.post('/admin/activation-requests/:id/approve', authMiddleware, adminMiddleware, activationCtl.approveActivationRequest);
router.post('/admin/activation-requests/:id/reject', authMiddleware, adminMiddleware, activationCtl.rejectActivationRequest);

// Routes pour les demandes de retrait
router.get('/admin/withdrawal-requests', authMiddleware, adminMiddleware, clientCtl.getWithdrawalRequests);
router.post('/admin/withdrawal-requests/:id/approve', authMiddleware, adminMiddleware, adminCtl.approveWithdrawalRequest);
router.post('/admin/withdrawal-requests/:id/generate-and-send-code', authMiddleware, adminMiddleware, adminCtl.generateAndSendWithdrawalCode);
router.post('/admin/withdrawal-requests/:id/generate-code', authMiddleware, adminMiddleware, adminCtl.generateWithdrawalCode);
router.post('/admin/withdrawal-requests/:id/reject', authMiddleware, adminMiddleware, clientCtl.rejectWithdrawalRequest);
router.post('/admin/withdrawal-requests/:id/decide', authMiddleware, adminMiddleware, adminCtl.adminDecideWithdrawal);

// Routes pour les messages modaux
router.get('/admin/modal-message', authMiddleware, adminMiddleware, activationCtl.getCurrentModalMessage);
router.post('/admin/modal-message', authMiddleware, adminMiddleware, activationCtl.updateModalMessage);
router.delete('/admin/modal-message/:id', authMiddleware, adminMiddleware, activationCtl.deactivateModalMessage);

// Route pour la suppression de compte client
router.delete('/admin/users/:id', authMiddleware, adminMiddleware, adminCtl.deleteUser);

export default router;
