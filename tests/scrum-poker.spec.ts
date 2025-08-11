import { expect, type Page, test } from '@playwright/test';

class ScrumPokerPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async createRoom(displayName: string, role: 'voter' | 'watcher') {
    await this.page.fill('#create-name', displayName);

    if (role === 'watcher') {
      await this.page.click('[data-testid="create-role-watcher"]');
    }

    await this.page.click('button[type="submit"]:has-text("Create Room")');
    await this.page.waitForURL(/\/room\/\d{6}/);
  }

  async joinRoom(code: string, displayName: string, role: 'voter' | 'watcher') {
    await this.page.fill('#join-code', code);
    await this.page.fill('#join-name', displayName);

    if (role === 'watcher') {
      await this.page.click('[data-testid="join-role-watcher"]');
    }

    await this.page.click('button[type="submit"]:has-text("Join Room")');
    await this.page.waitForURL(/\/room\/\d{6}/);
  }

  async getRoomCode(): Promise<string> {
    const codeElement = await this.page.locator('code').first();
    return (await codeElement.textContent()) || '';
  }

  async selectVote(value: string) {
    await this.page.click(`button:has-text("${value}")`);
  }

  async revealVotes() {
    await this.page.click('button:has-text("Reveal Votes")');
  }

  async resetVotes(storyTitle?: string) {
    if (storyTitle) {
      await this.page.fill('input[placeholder*="story title"]', storyTitle);
    }
    await this.page.click('button:has-text("Reset for New Round")');
  }

  async waitForRoomState(state: 'voting' | 'revealed') {
    const expectedText = state === 'voting' ? 'Voting' : 'Revealed';
    await expect(this.page.locator(`text=${expectedText}`)).toBeVisible();
  }

  async getParticipantCount(): Promise<number> {
    const participantsHeader = await this.page
      .locator('h3:has-text("Participants")')
      .first();
    const countBadge = participantsHeader.locator(
      '+ div >> text=/d+/d+ voted/'
    );
    const countText = await countBadge.textContent();
    const match = countText?.match(/\d+$/);
    return match ? Number.parseInt(match[0]) : 0;
  }

  async getVoteStats() {
    return {
      min: await this.page.locator('[data-testid="vote-min"]').textContent(),
      max: await this.page.locator('[data-testid="vote-max"]').textContent(),
      average: await this.page
        .locator('[data-testid="vote-average"]')
        .textContent(),
      hasConsensus: await this.page.locator('text=Consensus!').isVisible(),
    };
  }
}

test.describe('Scrum Poker E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for server to be ready
    await page.goto('/');
    await expect(page.locator('text=Server connected')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('Create a new game room', async ({ page }) => {
    const scrumPoker = new ScrumPokerPage(page);

    // Navigate to home page
    await scrumPoker.goto();

    // Verify we're on the home page
    await expect(page.locator('text=SCRUM POKER')).toBeVisible();
    await expect(page.locator('text=Create New Room')).toBeVisible();
    await expect(page.locator('text=Join Existing Room')).toBeVisible();

    // Create a room as a voter
    await scrumPoker.createRoom('Alice', 'voter');

    // Verify we're in the room
    await expect(page.locator('text=Room')).toBeVisible();
    await expect(page.locator('text=Alice (you)')).toBeVisible();
    await expect(page.locator('text=voter')).toBeVisible();

    // Verify the Fibonacci deck is visible
    await expect(page.locator('button:has-text("0")')).toBeVisible();
    await expect(page.locator('button:has-text("1")')).toBeVisible();
    await expect(page.locator('button:has-text("2")')).toBeVisible();
    await expect(page.locator('button:has-text("100")')).toBeVisible();

    // Verify room controls
    await expect(page.locator('button:has-text("Reveal Votes")')).toBeVisible();
    await expect(page.locator('text=Copy Join Link')).toBeVisible();
  });

  test('Join a room via code or link', async ({ page, context }) => {
    const scrumPoker1 = new ScrumPokerPage(page);

    // Create a room first
    await scrumPoker1.goto();
    await scrumPoker1.createRoom('Alice', 'voter');

    const roomCode = await scrumPoker1.getRoomCode();
    expect(roomCode).toMatch(/^\d{6}$/);

    // Open a second browser context for the second user
    const page2 = await context.newPage();
    const scrumPoker2 = new ScrumPokerPage(page2);

    await scrumPoker2.goto();
    await scrumPoker2.joinRoom(roomCode, 'Bob', 'voter');

    // Verify Bob joined successfully
    await expect(page2.locator('text=Bob (you)')).toBeVisible();
    await expect(page2.locator('text=Alice')).toBeVisible();

    // Verify Alice can see Bob joined
    await expect(page.locator('text=Bob')).toBeVisible({ timeout: 5000 });

    // Test duplicate name prevention
    const page3 = await context.newPage();
    const scrumPoker3 = new ScrumPokerPage(page3);

    await scrumPoker3.goto();
    await scrumPoker3.joinRoom(roomCode, 'Alice', 'voter');

    // Should see error message about duplicate name
    await expect(
      page3.locator('text=Display name already taken')
    ).toBeVisible();

    await page2.close();
    await page3.close();
  });

  test('Choose an estimation card (Fibonacci)', async ({ page }) => {
    const scrumPoker = new ScrumPokerPage(page);

    await scrumPoker.goto();
    await scrumPoker.createRoom('Alice', 'voter');

    // Select different cards and verify selection
    const fibonacciValues = [
      '0',
      '0.5',
      '1',
      '2',
      '3',
      '5',
      '8',
      '13',
      '20',
      '40',
      '100',
    ];

    for (const value of fibonacciValues.slice(0, 3)) {
      // Test first 3 values
      await scrumPoker.selectVote(value);

      // The selected card should be highlighted
      const selectedCard = page.locator(`button:has-text("${value}")`);
      await expect(selectedCard).toHaveClass(/ring-2/);

      // Status should show "voted"
      await expect(page.locator('text=voted')).toBeVisible();
    }

    // Test that watchers cannot vote
    await page.click('button:has-text("Leave Room")');
    await page.waitForURL('/');

    await scrumPoker.createRoom('Watcher', 'watcher');

    // Fibonacci deck should not be visible for watchers
    await expect(page.locator('text=Select Your Estimate')).not.toBeVisible();
    await expect(page.locator('text=watching')).toBeVisible();
  });

  test('Keep votes hidden until reveal', async ({ page, context }) => {
    const scrumPoker1 = new ScrumPokerPage(page);

    // Create room and get room code
    await scrumPoker1.goto();
    await scrumPoker1.createRoom('Alice', 'voter');
    const roomCode = await scrumPoker1.getRoomCode();

    // Alice votes
    await scrumPoker1.selectVote('5');

    // Second user joins
    const page2 = await context.newPage();
    const scrumPoker2 = new ScrumPokerPage(page2);
    await scrumPoker2.goto();
    await scrumPoker2.joinRoom(roomCode, 'Bob', 'voter');

    // Bob votes
    await scrumPoker2.selectVote('8');

    // Both users should see "voted" status but not actual values
    await expect(page.locator('text=Alice (you)')).toBeVisible();
    await expect(page.locator('text=voted')).toBeVisible();
    await expect(page2.locator('text=Bob (you)')).toBeVisible();
    await expect(page2.locator('text=voted')).toBeVisible();

    // Actual vote values should not be visible
    await expect(
      page.locator('[data-testid="vote-value-5"]')
    ).not.toBeVisible();
    await expect(
      page.locator('[data-testid="vote-value-8"]')
    ).not.toBeVisible();
    await expect(
      page2.locator('[data-testid="vote-value-5"]')
    ).not.toBeVisible();
    await expect(
      page2.locator('[data-testid="vote-value-8"]')
    ).not.toBeVisible();

    // Voting count should show 2/2
    await expect(page.locator('text=2/2 voted')).toBeVisible();

    await page2.close();
  });

  test('Reveal all votes simultaneously', async ({ page, context }) => {
    const scrumPoker1 = new ScrumPokerPage(page);

    // Setup: Create room with multiple voters
    await scrumPoker1.goto();
    await scrumPoker1.createRoom('Alice', 'voter');
    const roomCode = await scrumPoker1.getRoomCode();

    // Add second voter
    const page2 = await context.newPage();
    const scrumPoker2 = new ScrumPokerPage(page2);
    await scrumPoker2.goto();
    await scrumPoker2.joinRoom(roomCode, 'Bob', 'voter');

    // Add third voter for more complex stats
    const page3 = await context.newPage();
    const scrumPoker3 = new ScrumPokerPage(page3);
    await scrumPoker3.goto();
    await scrumPoker3.joinRoom(roomCode, 'Charlie', 'voter');

    // Everyone votes
    await scrumPoker1.selectVote('5');
    await scrumPoker2.selectVote('8');
    await scrumPoker3.selectVote('5');

    // Wait for all votes to be cast
    await expect(page.locator('text=3/3 voted')).toBeVisible();

    // Reveal votes
    await scrumPoker1.revealVotes();

    // All pages should show revealed state
    await scrumPoker1.waitForRoomState('revealed');
    await scrumPoker2.waitForRoomState('revealed');
    await scrumPoker3.waitForRoomState('revealed');

    // Vote values should be visible
    await expect(page.locator('text=5').nth(1)).toBeVisible(); // Alice's vote
    await expect(page.locator('text=8').nth(1)).toBeVisible(); // Bob's vote
    await expect(page.locator('text=5').nth(2)).toBeVisible(); // Charlie's vote

    // Stats should be calculated and displayed
    await expect(page.locator('text=Min')).toBeVisible();
    await expect(page.locator('text=Max')).toBeVisible();
    await expect(page.locator('text=Average')).toBeVisible();

    // Min should be 5, Max should be 8
    const minValue = await page.locator('.text-green-600').textContent();
    const maxValue = await page.locator('.text-red-600').textContent();
    expect(minValue).toBe('5');
    expect(maxValue).toBe('8');

    // Average should be 6.0 ((5+8+5)/3)
    const avgValue = await page.locator('.text-blue-600').textContent();
    expect(avgValue).toBe('6.0');

    // Vote distribution should show counts
    await expect(page.locator('text=2 votes')).toBeVisible(); // for value 5
    await expect(page.locator('text=1 vote')).toBeVisible(); // for value 8

    // Votes should be read-only after reveal
    const voteButton = page.locator('button:has-text("3")');
    await expect(voteButton).toBeDisabled();

    await page2.close();
    await page3.close();
  });

  test('Test consensus detection', async ({ page, context }) => {
    const scrumPoker1 = new ScrumPokerPage(page);

    await scrumPoker1.goto();
    await scrumPoker1.createRoom('Alice', 'voter');
    const roomCode = await scrumPoker1.getRoomCode();

    // Add second voter
    const page2 = await context.newPage();
    const scrumPoker2 = new ScrumPokerPage(page2);
    await scrumPoker2.goto();
    await scrumPoker2.joinRoom(roomCode, 'Bob', 'voter');

    // Both vote the same value
    await scrumPoker1.selectVote('8');
    await scrumPoker2.selectVote('8');

    await scrumPoker1.revealVotes();

    // Should show consensus badge
    await expect(page.locator('text=Consensus!')).toBeVisible();

    await page2.close();
  });

  test('Reset for a new round', async ({ page, context }) => {
    const scrumPoker1 = new ScrumPokerPage(page);

    await scrumPoker1.goto();
    await scrumPoker1.createRoom('Alice', 'voter');
    const roomCode = await scrumPoker1.getRoomCode();

    const page2 = await context.newPage();
    const scrumPoker2 = new ScrumPokerPage(page2);
    await scrumPoker2.goto();
    await scrumPoker2.joinRoom(roomCode, 'Bob', 'voter');

    // Complete a voting round
    await scrumPoker1.selectVote('3');
    await scrumPoker2.selectVote('5');
    await scrumPoker1.revealVotes();

    // Reset with a story title
    const storyTitle = 'User can login with email';
    await scrumPoker1.resetVotes(storyTitle);

    // Should return to voting state
    await scrumPoker1.waitForRoomState('voting');
    await scrumPoker2.waitForRoomState('voting');

    // Story title should be displayed
    await expect(page.locator(`text=${storyTitle}`)).toBeVisible();

    // Participants should remain
    await expect(page.locator('text=Alice (you)')).toBeVisible();
    await expect(page.locator('text=Bob')).toBeVisible();

    // Votes should be cleared
    await expect(page.locator('text=0/2 voted')).toBeVisible();

    // Cards should be selectable again
    const voteButton = page.locator('button:has-text("8")');
    await expect(voteButton).toBeEnabled();

    await page2.close();
  });

  test('Realtime "who has voted" status', async ({ page, context }) => {
    const scrumPoker1 = new ScrumPokerPage(page);

    await scrumPoker1.goto();
    await scrumPoker1.createRoom('Alice', 'voter');
    const roomCode = await scrumPoker1.getRoomCode();

    // Initially 0/1 voted
    await expect(page.locator('text=0/1 voted')).toBeVisible();

    const page2 = await context.newPage();
    const scrumPoker2 = new ScrumPokerPage(page2);
    await scrumPoker2.goto();
    await scrumPoker2.joinRoom(roomCode, 'Bob', 'voter');

    // Now should show 0/2 voted
    await expect(page.locator('text=0/2 voted')).toBeVisible({ timeout: 5000 });

    // Alice votes
    await scrumPoker1.selectVote('2');

    // Should update to 1/2 voted within ~1s
    await expect(page2.locator('text=1/2 voted')).toBeVisible({
      timeout: 2000,
    });

    // Bob votes
    await scrumPoker2.selectVote('3');

    // Should update to 2/2 voted
    await expect(page.locator('text=2/2 voted')).toBeVisible({ timeout: 2000 });

    await page2.close();
  });

  test('Participant list with roles and presence', async ({
    page,
    context,
  }) => {
    const scrumPoker1 = new ScrumPokerPage(page);

    await scrumPoker1.goto();
    await scrumPoker1.createRoom('Alice', 'voter');
    const roomCode = await scrumPoker1.getRoomCode();

    // Add watcher
    const page2 = await context.newPage();
    const scrumPoker2 = new ScrumPokerPage(page2);
    await scrumPoker2.goto();
    await scrumPoker2.joinRoom(roomCode, 'Observer', 'watcher');

    // Verify participant list shows correct roles
    await expect(page.locator('text=Alice (you)')).toBeVisible();
    await expect(page.locator('text=voter')).toBeVisible();
    await expect(page.locator('text=Observer')).toBeVisible();
    await expect(page.locator('text=watcher')).toBeVisible();

    // Both should show as connected (green dot)
    await expect(page.locator('.bg-green-500')).toHaveCount(2);

    // Alice votes
    await scrumPoker1.selectVote('5');

    // Alice should show "voted", Observer should show "watching"
    await expect(
      page.locator('text=Alice (you)').locator('.. >> text=voted')
    ).toBeVisible();
    await expect(
      page.locator('text=Observer').locator('.. >> text=watching')
    ).toBeVisible();

    // Close observer's page to simulate disconnect
    await page2.close();

    // Observer should eventually show as disconnected (but this requires WebSocket timeout)
    // For now, just verify they're removed from the list after explicit leave

    await page2.close();
  });

  test('Handle invalid room codes and edge cases', async ({ page }) => {
    const scrumPoker = new ScrumPokerPage(page);

    await scrumPoker.goto();

    // Test invalid room code
    await scrumPoker.joinRoom('999999', 'TestUser', 'voter');
    await expect(page.locator('text=Room not found')).toBeVisible();

    // Test empty display name
    await page.fill('#create-name', '');
    await page.click('button[type="submit"]:has-text("Create Room")');
    await expect(
      page.locator('text=Please enter a display name')
    ).toBeVisible();

    // Test empty room code
    await page.fill('#join-code', '');
    await page.fill('#join-name', 'TestUser');
    await page.click('button[type="submit"]:has-text("Join Room")');
    await expect(
      page.locator('text=Please enter both room code and display name')
    ).toBeVisible();
  });

  test('Test reveal/reset idempotency', async ({ page }) => {
    const scrumPoker = new ScrumPokerPage(page);

    await scrumPoker.goto();
    await scrumPoker.createRoom('Alice', 'voter');

    await scrumPoker.selectVote('8');

    // Click reveal multiple times rapidly
    await Promise.all([
      scrumPoker.revealVotes(),
      scrumPoker.revealVotes(),
      scrumPoker.revealVotes(),
    ]);

    // Should not break - votes should be revealed once
    await expect(page.locator('text=8').nth(1)).toBeVisible();
    await scrumPoker.waitForRoomState('revealed');

    // Click reset multiple times
    await Promise.all([
      scrumPoker.resetVotes(),
      scrumPoker.resetVotes(),
      scrumPoker.resetVotes(),
    ]);

    // Should return to voting state cleanly
    await scrumPoker.waitForRoomState('voting');
    await expect(page.locator('text=0/1 voted')).toBeVisible();
  });

  test('Room URL sharing and direct access', async ({ page, context }) => {
    const scrumPoker1 = new ScrumPokerPage(page);

    await scrumPoker1.goto();
    await scrumPoker1.createRoom('Alice', 'voter');

    const currentUrl = page.url();
    const roomCode = currentUrl.match(/\/room\/(\d{6})$/)?.[1];
    expect(roomCode).toMatch(/^\d{6}$/);

    // Test direct URL access
    const page2 = await context.newPage();
    await page2.goto(currentUrl);

    // Should be redirected to home page since not a participant
    await expect(page2.locator('text=Room not found')).toBeVisible();

    await page2.close();
  });
});
