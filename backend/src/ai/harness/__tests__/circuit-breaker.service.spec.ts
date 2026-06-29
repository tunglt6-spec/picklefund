import { CircuitBreakerService } from '../circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    service = new CircuitBreakerService();
    service.configure({
      failureThreshold: 3,
      recoveryTimeoutMs: 60_000,
      halfOpenMaxCalls: 1,
    });
  });

  it('starts in CLOSED state', () => {
    expect(service.getState('provider-a')).toBe('CLOSED');
    expect(service.isAllowed('provider-a')).toBe(true);
  });

  it('opens after reaching failure threshold', () => {
    service.recordFailure('p');
    service.recordFailure('p');
    expect(service.getState('p')).toBe('CLOSED');
    service.recordFailure('p');
    expect(service.getState('p')).toBe('OPEN');
    expect(service.isAllowed('p')).toBe(false);
  });

  it('transitions to HALF_OPEN after recovery timeout', () => {
    jest.useFakeTimers();
    service.recordFailure('p');
    service.recordFailure('p');
    service.recordFailure('p');
    expect(service.getState('p')).toBe('OPEN');

    jest.advanceTimersByTime(60_001);
    expect(service.getState('p')).toBe('HALF_OPEN');
    expect(service.isAllowed('p')).toBe(true);
    jest.useRealTimers();
  });

  it('closes after successful call in HALF_OPEN', () => {
    jest.useFakeTimers();
    service.recordFailure('p');
    service.recordFailure('p');
    service.recordFailure('p');
    jest.advanceTimersByTime(60_001);
    service.getState('p'); // trigger OPEN→HALF_OPEN
    service.recordSuccess('p');
    expect(service.getState('p')).toBe('CLOSED');
    jest.useRealTimers();
  });

  it('re-opens on failure in HALF_OPEN', () => {
    jest.useFakeTimers();
    service.recordFailure('p');
    service.recordFailure('p');
    service.recordFailure('p');
    jest.advanceTimersByTime(60_001);
    service.getState('p');
    service.recordFailure('p');
    expect(service.getState('p')).toBe('OPEN');
    jest.useRealTimers();
  });

  it('resets provider state', () => {
    service.recordFailure('p');
    service.recordFailure('p');
    service.recordFailure('p');
    service.reset('p');
    expect(service.getState('p')).toBe('CLOSED');
    expect(service.isAllowed('p')).toBe(true);
  });

  it('handles multiple providers independently', () => {
    service.recordFailure('a');
    service.recordFailure('a');
    service.recordFailure('a');
    expect(service.getState('a')).toBe('OPEN');
    expect(service.getState('b')).toBe('CLOSED');
  });
});
