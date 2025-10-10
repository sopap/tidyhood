import { parseIntent } from '../intent-parser';

// Mock conversation states for testing
const mockConversation = {
  id: 'test-conv',
  partner_phone: '+15555555555',
  order_id: 'test-order',
  state: 'awaiting_pickup_confirmation' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('SMS Intent Parser', () => {
  describe('Confirmation patterns', () => {
    it('should parse "confirm" as confirm intent', async () => {
      const intent = await parseIntent('confirm', mockConversation);
      expect(intent.type).toBe('confirm');
    });

    it('should parse "CONFIRM" (uppercase) as confirm intent', async () => {
      const intent = await parseIntent('CONFIRM', mockConversation);
      expect(intent.type).toBe('confirm');
    });

    it('should parse "yes" as confirm intent', async () => {
      const intent = await parseIntent('yes', mockConversation);
      expect(intent.type).toBe('confirm');
    });

    it('should parse "ok" as confirm intent', async () => {
      const intent = await parseIntent('ok', mockConversation);
      expect(intent.type).toBe('confirm');
    });
  });

  describe('Weight patterns', () => {
    it('should parse "18" as weight intent', async () => {
      const intent = await parseIntent('18', mockConversation);
      expect(intent.type).toBe('weight');
      expect(intent.data?.weight).toBe(18);
    });

    it('should parse "25 lbs" as weight intent', async () => {
      const intent = await parseIntent('25 lbs', mockConversation);
      expect(intent.type).toBe('weight');
      expect(intent.data?.weight).toBe(25);
    });

    it('should parse "14.5" as weight intent with decimal', async () => {
      const intent = await parseIntent('14.5', mockConversation);
      expect(intent.type).toBe('weight');
      expect(intent.data?.weight).toBe(14.5);
    });
  });

  describe('Status update patterns', () => {
    it('should parse "picked up" as picked_up intent', async () => {
      const intent = await parseIntent('picked up', mockConversation);
      expect(intent.type).toBe('picked_up');
    });

    it('should parse "PICKED UP" (uppercase) as picked_up intent', async () => {
      const intent = await parseIntent('PICKED UP', mockConversation);
      expect(intent.type).toBe('picked_up');
    });

    it('should parse "delivered" as delivered intent', async () => {
      const intent = await parseIntent('delivered', mockConversation);
      expect(intent.type).toBe('delivered');
    });
  });

  describe('Help patterns', () => {
    it('should parse "help" as help intent', async () => {
      const intent = await parseIntent('help', mockConversation);
      expect(intent.type).toBe('help');
    });

    it('should parse "?" as help intent', async () => {
      const intent = await parseIntent('?', mockConversation);
      expect(intent.type).toBe('help');
    });
  });

  describe('Reschedule patterns', () => {
    it('should parse "reschedule" as reschedule intent', async () => {
      const intent = await parseIntent('reschedule', mockConversation);
      expect(intent.type).toBe('reschedule');
    });

    it('should parse "can\'t make it" as reschedule intent', async () => {
      const intent = await parseIntent("can't make it", mockConversation);
      expect(intent.type).toBe('reschedule');
    });
  });

  describe('Cancel patterns', () => {
    it('should parse "cancel" as cancel intent', async () => {
      const intent = await parseIntent('cancel', mockConversation);
      expect(intent.type).toBe('cancel');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty message', async () => {
      const intent = await parseIntent('', mockConversation);
      expect(intent.type).toBe('unknown');
    });

    it('should handle whitespace-only message', async () => {
      const intent = await parseIntent('   ', mockConversation);
      expect(intent.type).toBe('unknown');
    });

    it('should handle ambiguous message (fallback to unknown)', async () => {
      const intent = await parseIntent('random text that matches nothing', mockConversation);
      expect(intent.type).toBe('unknown');
    });
  });
});
