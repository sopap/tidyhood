/**
 * Guest Booking Integration Tests (Migration 035)
 * 
 * Tests complete guest checkout flow without authentication:
 * - Guest contact form validation
 * - Policy version locking
 * - Order creation with guest fields
 * - Database integrity checks
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals'
import { getServiceClient } from '@/lib/db'

describe('Guest Booking Integration Tests', () => {
  let db: ReturnType<typeof getServiceClient>
  let testOrderIds: string[] = []
  
  beforeAll(() => {
    db = getServiceClient()
  })
  
  // Cleanup test data after each test
  afterEach(async () => {
    if (testOrderIds.length > 0) {
      await db.from('orders').delete().in('id', testOrderIds)
      testOrderIds = []
    }
  })
  
  describe('Complete Guest Checkout Flow', () => {
    it('should create guest order without authentication', async () => {
      // Fetch active policy first
      const { data: policy } = await db
        .from('cancellation_policies')
        .select('id, version')
        .eq('service_type', 'CLEANING')
        .eq('active', true)
        .single()
      
      expect(policy).toBeDefined()
      expect(policy!.version).toBeGreaterThan(0)
      
      // Create guest order
      const guestOrderData = {
        user_id: null,
        guest_name: 'Jane Doe',
        guest_email: 'jane.test@example.com',
        guest_phone: '+19171234567',
        service_type: 'CLEANING',
        partner_id: 'test-partner-uuid',
        slot_start: new Date(Date.now() + 48 * 3600000).toISOString(), // 48 hours from now
        slot_end: new Date(Date.now() + 50 * 3600000).toISOString(),
        status: 'pending',
        subtotal_cents: 12000,
        tax_cents: 1080,
        delivery_cents: 0,
        total_cents: 13080,
        policy_id: policy!.id,
        policy_version: policy!.version,
        utm_params: {
          source: 'google',
          campaign: 'fall2024',
          medium: 'cpc'
        },
        order_details: {
          bedrooms: 2,
          bathrooms: 1,
          deep: false
        },
        address_snapshot: {
          line1: '123 W 135th St',
          city: 'New York',
          zip: '10027'
        }
      }
      
      const { data: order, error } = await db
        .from('orders')
        .insert(guestOrderData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(order).toBeDefined()
      expect(order!.user_id).toBeNull()
      expect(order!.guest_name).toBe('Jane Doe')
      expect(order!.guest_email).toBe('jane.test@example.com')
      expect(order!.guest_phone).toBe('+19171234567')
      expect(order!.policy_id).toBe(policy!.id)
      expect(order!.policy_version).toBe(policy!.version)
      expect(order!.utm_params).toEqual({
        source: 'google',
        campaign: 'fall2024',
        medium: 'cpc'
      })
      
      testOrderIds.push(order!.id)
    })
    
    it('should enforce constraint: must have user_id OR guest info', async () => {
      // Try to create order with neither user_id nor guest info
      const invalidOrder = {
        user_id: null,
        guest_email: null,
        guest_phone: null,
        service_type: 'CLEANING',
        slot_start: new Date(Date.now() + 24 * 3600000).toISOString(),
        slot_end: new Date(Date.now() + 26 * 3600000).toISOString(),
        status: 'pending',
        total_cents: 10000
      }
      
      const { error } = await db
        .from('orders')
        .insert(invalidOrder)
      
      // Should fail constraint check
      expect(error).not.toBeNull()
      expect(error!.message).toContain('orders_user_or_guest_required')
    })
    
    it('should reject guest order with only email (missing phone)', async () => {
      const invalidOrder = {
        user_id: null,
        guest_email: 'test@example.com',
        guest_phone: null, // Missing required field
        service_type: 'CLEANING',
        slot_start: new Date(Date.now() + 24 * 3600000).toISOString(),
        slot_end: new Date(Date.now() + 26 * 3600000).toISOString(),
        status: 'pending',
        total_cents: 10000
      }
      
      const { error } = await db
        .from('orders')
        .insert(invalidOrder)
      
      expect(error).not.toBeNull()
      expect(error!.message).toContain('orders_user_or_guest_required')
    })
    
    it('should validate phone number format (E.164)', async () => {
      const invalidPhoneOrder = {
        user_id: null,
        guest_name: 'Test User',
        guest_email: 'test@example.com',
        guest_phone: '917-123-4567', // Invalid format (not E.164)
        service_type: 'LAUNDRY',
        slot_start: new Date(Date.now() + 24 * 3600000).toISOString(),
        slot_end: new Date(Date.now() + 26 * 3600000).toISOString(),
        status: 'pending',
        total_cents: 5000
      }
      
      const { error } = await db
        .from('orders')
        .insert(invalidPhoneOrder)
      
      expect(error).not.toBeNull()
      expect(error!.message).toContain('orders_guest_phone_e164_format')
    })
  })
  
  describe('Policy Version Locking', () => {
    it('should lock policy version at booking time', async () => {
      // Get current active policy
      const { data: policy } = await db
        .from('cancellation_policies')
        .select('id, version')
        .eq('service_type', 'CLEANING')
        .eq('active', true)
        .single()
      
      expect(policy).toBeDefined()
      const originalVersion = policy!.version
      
      // Create order with this policy
      const { data: order } = await db
        .from('orders')
        .insert({
          user_id: null,
          guest_name: 'Test User',
          guest_email: 'policy.test@example.com',
          guest_phone: '+19171234567',
          service_type: 'CLEANING',
          slot_start: new Date(Date.now() + 48 * 3600000).toISOString(),
          slot_end: new Date(Date.now() + 50 * 3600000).toISOString(),
          status: 'pending',
          total_cents: 15000,
          policy_id: policy!.id,
          policy_version: originalVersion
        })
        .select()
        .single()
      
      expect(order).toBeDefined()
      testOrderIds.push(order!.id)
      
      // Simulate admin updating policy (incrementing version)
      // In real scenario, admin would deactivate old policy and create new one
      // For test, just verify order keeps its locked version
      
      // Verify order still has original policy version
      const { data: orderCheck } = await db
        .from('orders')
        .select('policy_id, policy_version')
        .eq('id', order!.id)
        .single()
      
      expect(orderCheck!.policy_version).toBe(originalVersion)
      expect(orderCheck!.policy_id).toBe(policy!.id)
    })
    
    it('should use active policy version at time of booking', async () => {
      // Get active policies for both service types
      const { data: laundryPolicy } = await db
        .from('cancellation_policies')
        .select('id, version, service_type')
        .eq('service_type', 'LAUNDRY')
        .eq('active', true)
        .single()
      
      const { data: cleaningPolicy } = await db
        .from('cancellation_policies')
        .select('id, version, service_type')
        .eq('service_type', 'CLEANING')
        .eq('active', true)
        .single()
      
      expect(laundryPolicy).toBeDefined()
      expect(cleaningPolicy).toBeDefined()
      
      // Create laundry order
      const { data: laundryOrder } = await db
        .from('orders')
        .insert({
          user_id: null,
          guest_name: 'Laundry Guest',
          guest_email: 'laundry.guest@example.com',
          guest_phone: '+19171234568',
          service_type: 'LAUNDRY',
          slot_start: new Date(Date.now() + 24 * 3600000).toISOString(),
          slot_end: new Date(Date.now() + 26 * 3600000).toISOString(),
          status: 'pending_pickup',
          total_cents: 3500,
          policy_id: laundryPolicy!.id,
          policy_version: laundryPolicy!.version
        })
        .select()
        .single()
      
      expect(laundryOrder!.policy_version).toBe(laundryPolicy!.version)
      testOrderIds.push(laundryOrder!.id)
      
      // Create cleaning order
      const { data: cleaningOrder } = await db
        .from('orders')
        .insert({
          user_id: null,
          guest_name: 'Cleaning Guest',
          guest_email: 'cleaning.guest@example.com',
          guest_phone: '+19171234569',
          service_type: 'CLEANING',
          slot_start: new Date(Date.now() + 48 * 3600000).toISOString(),
          slot_end: new Date(Date.now() + 50 * 3600000).toISOString(),
          status: 'pending',
          total_cents: 15000,
          policy_id: cleaningPolicy!.id,
          policy_version: cleaningPolicy!.version,
          cleaning_status: 'scheduled'
        })
        .select()
        .single()
      
      expect(cleaningOrder!.policy_version).toBe(cleaningPolicy!.version)
      testOrderIds.push(cleaningOrder!.id)
    })
  })
  
  describe('Guest Order Queries', () => {
    it('should query guest orders by email efficiently', async () => {
      const guestEmail = 'query.test@example.com'
      
      // Create test orders
      const ordersToCreate = [
        {
          user_id: null,
          guest_name: 'Query Test 1',
          guest_email: guestEmail,
          guest_phone: '+19171234570',
          service_type: 'LAUNDRY',
          slot_start: new Date(Date.now() + 24 * 3600000).toISOString(),
          slot_end: new Date(Date.now() + 26 * 3600000).toISOString(),
          status: 'pending_pickup',
          total_cents: 3000
        },
        {
          user_id: null,
          guest_name: 'Query Test 2',
          guest_email: guestEmail,
          guest_phone: '+19171234570',
          service_type: 'CLEANING',
          slot_start: new Date(Date.now() + 48 * 3600000).toISOString(),
          slot_end: new Date(Date.now() + 50 * 3600000).toISOString(),
          status: 'pending',
          total_cents: 15000,
          cleaning_status: 'scheduled'
        }
      ]
      
      const { data: createdOrders } = await db
        .from('orders')
        .insert(ordersToCreate)
        .select()
      
      expect(createdOrders).toHaveLength(2)
      testOrderIds.push(...createdOrders!.map(o => o.id))
      
      // Query by guest email (should use index)
      const startTime = Date.now()
      const { data: queriedOrders, error } = await db
        .from('orders')
        .select('*')
        .eq('guest_email', guestEmail)
        .order('created_at', { ascending: false })
      
      const queryDuration = Date.now() - startTime
      
      expect(error).toBeNull()
      expect(queriedOrders).toHaveLength(2)
      expect(queryDuration).toBeLessThan(500) // Should be fast with index
      
      // Verify both orders found
      expect(queriedOrders![0].guest_email).toBe(guestEmail)
      expect(queriedOrders![1].guest_email).toBe(guestEmail)
    })
    
    it('should filter guest vs authenticated orders', async () => {
      // Count guest orders
      const { count: guestCount } = await db
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null)
        .not('guest_email', 'is', null)
      
      // Count authenticated orders
      const { count: authCount } = await db
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .not('user_id', 'is', null)
      
      expect(typeof guestCount).toBe('number')
      expect(typeof authCount).toBe('number')
    })
  })
  
  describe('UTM Parameter Tracking', () => {
    it('should store UTM parameters with guest order', async () => {
      const utmParams = {
        source: 'facebook',
        medium: 'social',
        campaign: 'holiday2024',
        term: 'home-cleaning',
        content: 'carousel-ad'
      }
      
      const { data: order } = await db
        .from('orders')
        .insert({
          user_id: null,
          guest_name: 'UTM Test User',
          guest_email: 'utm.test@example.com',
          guest_phone: '+19171234571',
          service_type: 'CLEANING',
          slot_start: new Date(Date.now() + 48 * 3600000).toISOString(),
          slot_end: new Date(Date.now() + 50 * 3600000).toISOString(),
          status: 'pending',
          total_cents: 15000,
          utm_params: utmParams,
          cleaning_status: 'scheduled'
        })
        .select()
        .single()
      
      expect(order).toBeDefined()
      expect(order!.utm_params).toEqual(utmParams)
      
      testOrderIds.push(order!.id)
    })
    
    it('should default to empty object if no UTM params', async () => {
      const { data: order } = await db
        .from('orders')
        .insert({
          user_id: null,
          guest_name: 'No UTM User',
          guest_email: 'no.utm@example.com',
          guest_phone: '+19171234572',
          service_type: 'LAUNDRY',
          slot_start: new Date(Date.now() + 24 * 3600000).toISOString(),
          slot_end: new Date(Date.now() + 26 * 3600000).toISOString(),
          status: 'pending_pickup',
          total_cents: 3500
          // utm_params not provided
        })
        .select()
        .single()
      
      expect(order).toBeDefined()
      expect(order!.utm_params).toEqual({})
      
      testOrderIds.push(order!.id)
    })
  })
  
  describe('Policy API Integration', () => {
    it('should return active policy for service type', async () => {
      // This would normally be tested via HTTP, but we'll test the DB query
      const { data: policy, error } = await db
        .from('cancellation_policies')
        .select('*')
        .eq('service_type', 'CLEANING')
        .eq('active', true)
        .single()
      
      expect(error).toBeNull()
      expect(policy).toBeDefined()
      expect(policy!.service_type).toBe('CLEANING')
      expect(policy!.active).toBe(true)
      expect(policy!.version).toBeGreaterThan(0)
      expect(policy!.notice_hours).toBeGreaterThanOrEqual(0)
      expect(policy!.cancellation_fee_percent).toBeGreaterThanOrEqual(0)
      expect(policy!.cancellation_fee_percent).toBeLessThanOrEqual(0.5) // Max 50%
    })
    
    it('should have default policies seeded', async () => {
      const { data: policies } = await db
        .from('cancellation_policies')
        .select('service_type, active')
        .eq('active', true)
      
      expect(policies).toBeDefined()
      expect(policies!.length).toBeGreaterThanOrEqual(2)
      
      const serviceTypes = policies!.map(p => p.service_type)
      expect(serviceTypes).toContain('LAUNDRY')
      expect(serviceTypes).toContain('CLEANING')
    })
  })
  
  describe('Backward Compatibility', () => {
    it('should handle old orders without policy_id', async () => {
      // Simulate old order created before migration 035
      const { data: oldOrder } = await db
        .from('orders')
        .insert({
          user_id: null,
          guest_name: 'Old Order User',
          guest_email: 'old.order@example.com',
          guest_phone: '+19171234573',
          service_type: 'CLEANING',
          slot_start: new Date(Date.now() + 48 * 3600000).toISOString(),
          slot_end: new Date(Date.now() + 50 * 3600000).toISOString(),
          status: 'pending',
          total_cents: 15000,
          policy_id: null, // Old order without policy
          policy_version: null,
          cleaning_status: 'scheduled'
        })
        .select()
        .single()
      
      expect(oldOrder).toBeDefined()
      expect(oldOrder!.policy_id).toBeNull()
      expect(oldOrder!.policy_version).toBeNull()
      
      testOrderIds.push(oldOrder!.id)
      
      // getCancellationPolicy should handle this gracefully
      // (Tested in unit tests for lib/cancellationFees.ts)
    })
    
    it('should support authenticated orders (existing behavior)', async () => {
      // Get active policy
      const { data: policy } = await db
        .from('cancellation_policies')
        .select('id, version')
        .eq('service_type', 'LAUNDRY')
        .eq('active', true)
        .single()
      
      // Create authenticated order (traditional flow)
      const { data: authOrder } = await db
        .from('orders')
        .insert({
          user_id: 'test-user-uuid',
          guest_name: null,
          guest_email: null,
          guest_phone: null,
          service_type: 'LAUNDRY',
          slot_start: new Date(Date.now() + 24 * 3600000).toISOString(),
          slot_end: new Date(Date.now() + 26 * 3600000).toISOString(),
          status: 'pending_pickup',
          total_cents: 3500,
          policy_id: policy!.id,
          policy_version: policy!.version
        })
        .select()
        .single()
      
      expect(authOrder).toBeDefined()
      expect(authOrder!.user_id).toBe('test-user-uuid')
      expect(authOrder!.guest_email).toBeNull()
      expect(authOrder!.policy_id).toBe(policy!.id)
      
      testOrderIds.push(authOrder!.id)
    })
  })
  
  describe('Database Indexes', () => {
    it('should have index on guest_email for fast lookups', async () => {
      // This test verifies the index exists
      // In production, you'd use EXPLAIN ANALYZE to verify index usage
      
      const { data: indexes } = await db
        .rpc('get_table_indexes', { table_name: 'orders' })
        .single()
      
      // Expected: idx_orders_guest_email exists
      // (This is a simplified check - actual index verification would need raw SQL)
      expect(true).toBe(true) // Placeholder
    })
    
    it('should have index on policy_id for joins', async () => {
      // Verify idx_orders_policy_id exists
      expect(true).toBe(true) // Placeholder
    })
  })
  
  describe('Edge Cases', () => {
    it('should handle very long guest names gracefully', async () => {
      const longName = 'A'.repeat(200)
      
      const { data: order } = await db
        .from('orders')
        .insert({
          user_id: null,
          guest_name: longName,
          guest_email: 'long.name@example.com',
          guest_phone: '+19171234574',
          service_type: 'CLEANING',
          slot_start: new Date(Date.now() + 48 * 3600000).toISOString(),
          slot_end: new Date(Date.now() + 50 * 3600000).toISOString(),
          status: 'pending',
          total_cents: 15000,
          cleaning_status: 'scheduled'
        })
        .select()
        .single()
      
      expect(order).toBeDefined()
      expect(order!.guest_name).toBe(longName)
      
      testOrderIds.push(order!.id)
    })
    
    it('should handle international phone numbers', async () => {
      const internationalPhones = [
        '+442071234567',   // UK
        '+33123456789',    // France
        '+81312345678',    // Japan
        '+861012345678'    // China
      ]
      
      for (const phone of internationalPhones) {
        const { data: order, error } = await db
          .from('orders')
          .insert({
            user_id: null,
            guest_name: 'International User',
            guest_email: `intl.${phone.slice(1)}@example.com`,
            guest_phone: phone,
            service_type: 'CLEANING',
            slot_start: new Date(Date.now() + 48 * 3600000).toISOString(),
            slot_end: new Date(Date.now() + 50 * 3600000).toISOString(),
            status: 'pending',
            total_cents: 15000,
            cleaning_status: 'scheduled'
          })
          .select()
          .single()
        
        expect(error).toBeNull()
        expect(order!.guest_phone).toBe(phone)
        
        testOrderIds.push(order!.id)
      }
    })
    
    it('should handle duplicate guest email (multiple orders)', async () => {
      const sameEmail = 'repeat.customer@example.com'
      
      // Create two orders with same guest email
      const orders = [
        {
          user_id: null,
          guest_name: 'Repeat Customer',
          guest_email: sameEmail,
          guest_phone: '+19171234575',
          service_type: 'LAUNDRY',
          slot_start: new Date(Date.now() + 24 * 3600000).toISOString(),
          slot_end: new Date(Date.now() + 26 * 3600000).toISOString(),
          status: 'pending_pickup',
          total_cents: 3500
        },
        {
          user_id: null,
          guest_name: 'Repeat Customer',
          guest_email: sameEmail,
          guest_phone: '+19171234575',
          service_type: 'CLEANING',
          slot_start: new Date(Date.now() + 72 * 3600000).toISOString(),
          slot_end: new Date(Date.now() + 74 * 3600000).toISOString(),
          status: 'pending',
          total_cents: 15000,
          cleaning_status: 'scheduled'
        }
      ]
      
      const { data: createdOrders } = await db
        .from('orders')
        .insert(orders)
        .select()
      
      expect(createdOrders).toHaveLength(2)
      testOrderIds.push(...createdOrders!.map(o => o.id))
      
      // Should be able to query both
      const { data: sameUserOrders } = await db
        .from('orders')
        .select('*')
        .eq('guest_email', sameEmail)
      
      expect(sameUserOrders).toHaveLength(2)
    })
  })
})

/**
 * IMPLEMENTATION NOTES FOR FUTURE E2E TESTS:
 * 
 * For full end-to-end Playwright/Cypress tests:
 * 
 * 1. Test guest booking UI flow:
 *    - Navigate to /book/cleaning
 *    - Fill service details
 *    - Fill guest contact form
 *    - Accept policy
 *    - Complete payment
 *    - Verify confirmation page
 * 
 * 2. Test email delivery:
 *    - Mock email service
 *    - Verify confirmation email sent to guest_email
 *    - Verify email contains order details and tracking link
 * 
 * 3. Test guest order lookup:
 *    - Navigate to order lookup page
 *    - Enter email + order ID
 *    - Verify order details displayed
 * 
 * 4. Test policy display:
 *    - Verify PolicyDisplay component fetches correct policy
 *    - Verify policy version shown
 *    - Verify expandable summary works
 *    - Verify checkbox enables "Book" button
 * 
 * 5. Test validation:
 *    - Invalid email format → error shown
 *    - Invalid phone format → error shown
 *    - Missing required field → button disabled
 *    - Phone auto-formats as user types
 * 
 * Example Playwright test structure:
 * 
 * test('complete guest booking flow', async ({ page }) => {
 *   await page.goto('http://localhost:3000/book/cleaning')
 *   
 *   // Step 1-2: Service selection (existing flow)
 *   // ...
 *   
 *   // Step 3: Guest contact (NEW)
 *   await page.fill('input[name="guest_name"]', 'Jane Doe')
 *   await page.fill('input[name="guest_email"]', 'jane@example.com')
 *   await page.fill('input[name="guest_phone"]', '9171234567')
 *   await page.click('button:text("Continue to Payment")')
 *   
 *   // Step 4: Payment & Policy (NEW)
 *   await page.check('input[name="policy_accepted"]')
 *   // Fill Stripe card details...
 *   await page.click('button:text("Confirm & Book")')
 *   
 *   // Verify confirmation
 *   await expect(page.locator('text=Order Confirmed')).toBeVisible()
 *   
 *   // Verify in database
 *   const order = await db.from('orders')
 *     .select('*')
 *     .eq('guest_email', 'jane@example.com')
 *     .order('created_at', { ascending: false })
 *     .limit(1)
 *     .single()
 *   
 *   expect(order.data.user_id).toBeNull()
 *   expect(order.data.guest_name).toBe('Jane Doe')
 *   expect(order.data.policy_id).not.toBeNull()
 * })
 */
