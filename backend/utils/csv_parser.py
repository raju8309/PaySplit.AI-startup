import csv
import io
from typing import List, Dict

class BankCSVParser:
    """Parse bank CSV files and extract card/transaction data"""
    
    @staticmethod
    def parse_chase_csv(file_content: str) -> Dict:
        """Parse Chase bank CSV format"""
        reader = csv.DictReader(io.StringIO(file_content))
        
        transactions = []
        total_spent = 0
        
        for row in reader:
            try:
                amount = float(row.get('Amount', '0').replace('$', '').replace(',', ''))

                transaction = {
                    'date': row.get('Transaction Date', ''),
                    'description': row.get('Description', ''),
                    'category': row.get('Category', 'Other'),
                    'amount': abs(amount),
                    'type': 'debit' if amount < 0 else 'credit'
                }

                if amount < 0:
                    total_spent += abs(amount)

                transactions.append(transaction)
            except (ValueError, KeyError, AttributeError):
                # Skip rows with unparseable amounts or missing fields.
                continue
        
        return {
            'name': 'Chase Card',
            'card_type': 'Visa',
            'transactions': transactions,
            'balance': total_spent
        }
    
    @staticmethod
    def parse_generic_csv(file_content: str) -> Dict:
        """Parse generic bank CSV"""
        reader = csv.DictReader(io.StringIO(file_content))
        
        transactions = []
        total_spent = 0
        
        headers = reader.fieldnames or []
        
        date_cols = ['date', 'transaction date', 'post date', 'posting date']
        desc_cols = ['description', 'merchant', 'name', 'transaction']
        amount_cols = ['amount', 'debit', 'credit', 'transaction amount']
        category_cols = ['category', 'type', 'merchant category']
        
        date_col = next((col for col in headers if col.lower() in date_cols), None)
        desc_col = next((col for col in headers if col.lower() in desc_cols), None)
        amount_col = next((col for col in headers if col.lower() in amount_cols), None)
        category_col = next((col for col in headers if col.lower() in category_cols), None)
        
        for row in reader:
            try:
                amount_str = row.get(amount_col, '0') if amount_col else '0'
                amount = float(amount_str.replace('$', '').replace(',', '').replace('(', '-').replace(')', ''))
                
                transaction = {
                    'date': row.get(date_col, '') if date_col else '',
                    'description': row.get(desc_col, 'Unknown') if desc_col else 'Unknown',
                    'category': row.get(category_col, 'Other') if category_col else 'Other',
                    'amount': abs(amount),
                    'type': 'debit' if amount < 0 else 'credit'
                }
                
                if amount < 0:
                    total_spent += abs(amount)
                
                transactions.append(transaction)
            except (ValueError, KeyError, AttributeError):
                # Skip rows with unparseable amounts or missing fields.
                continue

        return {
            'name': 'Imported Card',
            'card_type': 'Unknown',
            'transactions': transactions,
            'balance': total_spent
        }
    
    @staticmethod
    def auto_detect_format(file_content: str) -> Dict:
        """Auto-detect CSV format"""
        if 'Transaction Date' in file_content and 'Post Date' in file_content:
            return BankCSVParser.parse_chase_csv(file_content)
        
        return BankCSVParser.parse_generic_csv(file_content)
    
    @staticmethod
    def suggest_card_details(transactions: List[Dict]) -> Dict:
        """Analyze transactions to suggest card details"""
        if not transactions:
            return {
                'suggested_limit': 1000,
                'suggested_balance': 0,
                'suggested_name': 'Imported Card',
                'transaction_count': 0
            }
        
        total = sum(t['amount'] for t in transactions if t['type'] == 'debit')
        
        suggested_limit = round(total * 3, -2)
        suggested_balance = round(total, 2)
        
        descriptions = [t['description'] for t in transactions[:10]]
        
        card_name = 'Imported Card'
        if any('CHASE' in d.upper() for d in descriptions):
            card_name = 'Chase Card'
        elif any('AMEX' in d.upper() or 'AMERICAN EXPRESS' in d.upper() for d in descriptions):
            card_name = 'AmEx Card'
        elif any('CAPITAL ONE' in d.upper() for d in descriptions):
            card_name = 'Capital One Card'
        elif any('DISCOVER' in d.upper() for d in descriptions):
            card_name = 'Discover Card'
        elif any('CITI' in d.upper() for d in descriptions):
            card_name = 'Citi Card'
        
        return {
            'suggested_limit': max(suggested_limit, 500),
            'suggested_balance': suggested_balance,
            'suggested_name': card_name,
            'transaction_count': len(transactions)
        }
