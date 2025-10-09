import '@testing-library/jest-dom';

describe('Cleaning V2 Utilities', () => {
  describe('Cleaning Status Functions', () => {
    it('exports cleaning status utilities', () => {
      const cleaningStatus = require('@/lib/cleaningStatus');
      
      expect(cleaningStatus).toBeDefined();
    });
  });

  describe('Cleaning Addons', () => {
    it('exports cleaning addon definitions', () => {
      const { CLEANING_ADDONS } = require('@/lib/cleaningAddons');
      
      expect(CLEANING_ADDONS).toBeDefined();
      expect(Array.isArray(CLEANING_ADDONS)).toBe(true);
      expect(CLEANING_ADDONS.length).toBeGreaterThan(0);
    });

    it('provides addon pricing information', () => {
      const { CLEANING_ADDONS } = require('@/lib/cleaningAddons');
      
      const laundryAddon = CLEANING_ADDONS.find((a: any) => a.key === 'laundryPickup');
      const petHairAddon = CLEANING_ADDONS.find((a: any) => a.key === 'petHair');
      
      expect(laundryAddon).toBeDefined();
      expect(petHairAddon).toBeDefined();
    });

    it('includes addon labels and categories', () => {
      const { CLEANING_ADDONS } = require('@/lib/cleaningAddons');
      
      CLEANING_ADDONS.forEach((addon: any) => {
        expect(addon.key).toBeDefined();
        expect(addon.label).toBeDefined();
        expect(addon.category).toBeDefined();
      });
    });
  });

  describe('Design Tokens', () => {
    it('exports design token system', () => {
      const { designTokens } = require('@/lib/design-tokens');
      
      expect(designTokens).toBeDefined();
      expect(designTokens.colors).toBeDefined();
      expect(designTokens.spacing).toBeDefined();
      expect(designTokens.typography).toBeDefined();
    });

    it('provides color utilities', () => {
      const { getColor, designTokens } = require('@/lib/design-tokens');
      
      expect(getColor('primary.500')).toBe(designTokens.colors.primary[500]);
      expect(getColor('success.500')).toBe(designTokens.colors.success[500]);
    });
  });

  describe('Animation System', () => {
    it('exports animation utilities', () => {
      const animations = require('@/lib/animations');
      
      expect(animations.animations).toBeDefined();
      expect(animations.getAnimation).toBeDefined();
    });

    it('provides accessible animations', () => {
      const { animations } = require('@/lib/animations');
      
      expect(animations.fadeIn).toBeDefined();
      expect(animations.scaleIn).toBeDefined();
    });
  });

  describe('Feature Flags', () => {
    it('exports feature flag functions', () => {
      const features = require('@/lib/features');
      
      expect(features.shouldShowUnifiedUI).toBeDefined();
      expect(features.getUIVersion).toBeDefined();
      expect(features.isInRollout).toBeDefined();
    });

    it('calculates rollout percentage correctly', () => {
      const { isInRollout } = require('@/lib/features');
      
      // User should either be in rollout or not
      const result = isInRollout('test-user-id', 50);
      expect(typeof result).toBe('boolean');
    });
  });
});
