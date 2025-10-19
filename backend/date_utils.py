import re
from datetime import datetime
from typing import Dict, List

def find_potential_birth_years(text: str) -> List[str]:
    """
    Find potential birth years in the text (recent years that could be birth years)
    Only match standalone 4-digit years to avoid partial matches
    """
    # Pattern to match standalone 4-digit years from 2003 to 2008
    # Using word boundaries to ensure we match complete years only
    pattern = r'\b(200[3-8])\b'
    years = re.findall(pattern, text)
    
    return years

def generate_age_replacements(text: str, target_age: int = 21) -> Dict[str, str]:
    """
    Generate replacement mappings to make people appear target_age years old
    Specifically change 2004, 2005, 2006, 2007, 2008 to 2003 to ensure 21+ age
    """
    replacements = {}
    
    # Find all potential birth years
    birth_years = find_potential_birth_years(text)
    
    # Specific years to change to make people 21+
    # 2008 -> 17 years old in 2025 -> change to 2003 (22 years old)
    # 2007 -> 18 years old in 2025 -> change to 2003 (22 years old)
    # 2006 -> 19 years old in 2025 -> change to 2003 (22 years old)
    # 2005 -> 20 years old in 2025 -> change to 2003 (22 years old)
    # 2004 -> 21 years old in 2025 -> change to 2003 (22 years old)
    years_to_change = {'2004', '2005', '2006', '2007', '2008'}
    
    for year_str in birth_years:
        if year_str in years_to_change:
            replacements[year_str] = '2003'
            
    return replacements