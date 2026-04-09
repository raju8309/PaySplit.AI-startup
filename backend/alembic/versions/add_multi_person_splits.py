"""Add multi-person split support to split_transactions

Revision ID: add_multi_person_splits
Revises: 
Create Date: 2026-04-07 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func


# revision identifiers, used by Alembic.
revision = 'add_multi_person_splits'
down_revision = None  # ← CHANGE THIS TO YOUR LAST MIGRATION ID
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upgrade database schema for multi-person splits"""
    
    # ── Add new columns to existing split_transactions table ────────────────
    op.add_column(
        'split_transactions',
        sa.Column('split_type', sa.String(), nullable=True, server_default='single_user')
    )
    op.add_column(
        'split_transactions',
        sa.Column('virtual_card_id', sa.String(), nullable=True)
    )

    # ── Create split_participants table ────────────────────────────────────
    op.create_table(
        'split_participants',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('split_transaction_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('card_id', sa.String(), nullable=False),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column('percentage', sa.Float(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('plaid_access_token', sa.String(), nullable=True),
        sa.Column('plaid_account_id', sa.String(), nullable=True),
        sa.Column('invited_at', sa.DateTime(timezone=True), nullable=False, server_default=func.now()),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('charged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('declined_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('decline_reason', sa.String(), nullable=True),
        sa.Column('plaid_transfer_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for split_participants
    op.create_index(
        'ix_split_participants_split_transaction_id',
        'split_participants',
        ['split_transaction_id']
    )
    op.create_index(
        'ix_split_participants_user_id',
        'split_participants',
        ['user_id']
    )
    op.create_index(
        'ix_split_participants_status',
        'split_participants',
        ['status']
    )

    # ── Create split_invitations table ────────────────────────────────────
    op.create_table(
        'split_invitations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('split_participant_id', sa.String(), nullable=False),
        sa.Column('invitee_email', sa.String(), nullable=False),
        sa.Column('invitee_name', sa.String(), nullable=True),
        sa.Column('token', sa.String(), nullable=False, unique=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('invitation_sent_at', sa.DateTime(timezone=True), nullable=False, server_default=func.now()),
        sa.Column('approval_clicked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for split_invitations
    op.create_index(
        'ix_split_invitations_split_participant_id',
        'split_invitations',
        ['split_participant_id']
    )
    op.create_index(
        'ix_split_invitations_invitee_email',
        'split_invitations',
        ['invitee_email']
    )
    op.create_index(
        'ix_split_invitations_token',
        'split_invitations',
        ['token'],
        unique=True
    )


def downgrade() -> None:
    """Downgrade database schema for multi-person splits"""
    
    # ── Drop invitations table ──────────────────────────────────────────────
    op.drop_index('ix_split_invitations_token', table_name='split_invitations')
    op.drop_index('ix_split_invitations_invitee_email', table_name='split_invitations')
    op.drop_index('ix_split_invitations_split_participant_id', table_name='split_invitations')
    op.drop_table('split_invitations')

    # ── Drop participants table ────────────────────────────────────────────
    op.drop_index('ix_split_participants_status', table_name='split_participants')
    op.drop_index('ix_split_participants_user_id', table_name='split_participants')
    op.drop_index('ix_split_participants_split_transaction_id', table_name='split_participants')
    op.drop_table('split_participants')

    # ── Remove new columns from split_transactions ──────────────────────────
    op.drop_column('split_transactions', 'virtual_card_id')
    op.drop_column('split_transactions', 'split_type')