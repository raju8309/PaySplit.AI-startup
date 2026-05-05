"""Create initial tables

Revision ID: create_initial_tables
Revises:
Create Date: 2026-05-05 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func

# revision identifiers, used by Alembic.
revision = 'create_initial_tables'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ── users ──────────────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('google_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_google_id', 'users', ['google_id'], unique=True)

    # ── cards ──────────────────────────────────────────────────────────────
    op.create_table(
        'cards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('card_type', sa.String(), nullable=False),
        sa.Column('last_four', sa.String(4), nullable=True),
        sa.Column('limit', sa.Float(), nullable=False),
        sa.Column('balance', sa.Float(), nullable=False),
        sa.Column('rewards_rate', sa.Float(), nullable=False),
        sa.Column('category_multipliers', sa.JSON(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_preferred', sa.Boolean(), nullable=True),
        sa.Column('color', sa.String(), nullable=True),
        sa.Column('icon', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_cards_id', 'cards', ['id'])

    # ── payments ───────────────────────────────────────────────────────────
    op.create_table(
        'payments',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('from_user', sa.String(), nullable=False),
        sa.Column('to_user', sa.String(), nullable=False),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('stripe_session_id', sa.String(), nullable=True),
        sa.Column('group_id', sa.String(), nullable=True),
        sa.Column('settlement_ref', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # ── groups ─────────────────────────────────────────────────────────────
    op.create_table(
        'groups',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # ── expenses ───────────────────────────────────────────────────────────
    op.create_table(
        'expenses',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column('payer_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # ── virtual_cards ──────────────────────────────────────────────────────
    op.create_table(
        'virtual_cards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('stripe_card_id', sa.String(), nullable=False),
        sa.Column('stripe_cardholder_id', sa.String(), nullable=True),
        sa.Column('last4', sa.String(4), nullable=True),
        sa.Column('exp_month', sa.Integer(), nullable=True),
        sa.Column('exp_year', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stripe_card_id')
    )
    op.create_index('ix_virtual_cards_id', 'virtual_cards', ['id'])

    # ── split_preferences ──────────────────────────────────────────────────
    op.create_table(
        'split_preferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('stripe_card_id', sa.String(), nullable=False),
        sa.Column('card_id', sa.Integer(), sa.ForeignKey('cards.id'), nullable=False),
        sa.Column('card_name', sa.String(), nullable=False),
        sa.Column('percentage', sa.Float(), nullable=False),
        sa.Column('plaid_access_token', sa.String(), nullable=True),
        sa.Column('plaid_account_id', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_split_preferences_id', 'split_preferences', ['id'])
    op.create_index('ix_split_preferences_stripe_card_id', 'split_preferences', ['stripe_card_id'])

    # ── split_transactions ─────────────────────────────────────────────────
    op.create_table(
        'split_transactions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('stripe_card_id', sa.String(), nullable=False),
        sa.Column('merchant', sa.String(), nullable=True),
        sa.Column('total_amount_cents', sa.Integer(), nullable=False),
        sa.Column('card_name', sa.String(), nullable=False),
        sa.Column('card_amount_cents', sa.Integer(), nullable=False),
        sa.Column('percentage', sa.Float(), nullable=False),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=func.now()),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('split_transactions')
    op.drop_index('ix_split_preferences_stripe_card_id', table_name='split_preferences')
    op.drop_index('ix_split_preferences_id', table_name='split_preferences')
    op.drop_table('split_preferences')
    op.drop_index('ix_virtual_cards_id', table_name='virtual_cards')
    op.drop_table('virtual_cards')
    op.drop_table('expenses')
    op.drop_table('groups')
    op.drop_table('payments')
    op.drop_index('ix_cards_id', table_name='cards')
    op.drop_table('cards')
    op.drop_index('ix_users_google_id', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')