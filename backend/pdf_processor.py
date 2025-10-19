import fitz  # PyMuPDF
import os
from typing import Dict, Any, Optional

def find_font_file():
    """Find NotoSerifTamil font file on the system (matches original)."""
    possible_paths = [
        # Noto Serif Tamil - exact match for the original
        "/usr/share/fonts/noto/NotoSerifTamil-Regular.ttf",
        "/usr/share/fonts/truetype/noto/NotoSerifTamil-Regular.ttf",
        "/usr/share/fonts/google-noto/NotoSerifTamil-Regular.ttf",
        "/usr/share/fonts/TTF/NotoSerifTamil-Regular.ttf",
        # Fallback to Times/Liberation
        "/usr/share/fonts/TTF/times.ttf",
        "/usr/share/fonts/liberation/LiberationSerif-Regular.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
    ]

    for path in possible_paths:
        expanded_path = os.path.expanduser(path)
        if os.path.exists(expanded_path):
            return expanded_path

    return None

def replace_numbers_in_pdf(input_pdf, output_pdf, replacements, authenticated_doc=None):
    """
    Replace specific numbers in a PDF while preserving exact formatting.

    Args:
        input_pdf: Path to input PDF file
        output_pdf: Path to output PDF file
        replacements: Dictionary mapping old numbers to new numbers
                     e.g., {"2007": "2003"}
        authenticated_doc: Optional authenticated PDF document instance
                      
    Returns:
        dict: Contains total_replacements count and replacement_details
    """
    # Initialize result tracking
    total_replacements = 0
    replacement_details = {}
    
    # Initialize details for each replacement
    for old_value, new_value in replacements.items():
        replacement_details[old_value] = {
            "new_value": new_value,
            "count": 0,
            "found": False
        }

    # Find the font file
    font_file = find_font_file()
    if not font_file:
        print("Warning: NotoSerifTamil not found. Using built-in font.")
        print("Install with: sudo pacman -S noto-fonts")
        font_file = None
    else:
        print(f"Using font: {font_file}")

    # Open the PDF - use authenticated document if provided, otherwise open normally
    if authenticated_doc:
        doc = authenticated_doc
        print(f"Using authenticated document instance")
    else:
        doc = fitz.open(input_pdf)
        # Check if document needs password (should already be authenticated by this point)
        if doc.needs_pass:
            print("⚠️  Warning: PDF still requires password authentication")

    print(f"\n📄 Processing PDF: {input_pdf}")
    print(f"📊 Total pages: {len(doc)}\n")

    # Iterate through each page
    for page_num in range(len(doc)):
        page = doc[page_num]
        print(f"🔍 Scanning page {page_num + 1}...")

        # Get all text with detailed formatting information
        text_result = page.get_text("dict")
        # Ensure we're working with a dictionary
        text_dict: Dict[str, Any] = text_result if isinstance(text_result, dict) else {}
        blocks = text_dict.get("blocks", [])

        page_replacements = 0

        # Search and replace each number
        for old_value, new_value in replacements.items():
            old_value_str = str(old_value)
            print(f"  🔎 Looking for: '{old_value_str}'")
            
            found_count = 0

            # Find all instances of the old value with formatting info
            for block in blocks:
                lines = block.get("lines", []) if isinstance(block, dict) else []
                for line in lines:
                    spans = line.get("spans", []) if isinstance(line, dict) else []
                    for span in spans:
                        if not isinstance(span, dict):
                            continue
                            
                        text = span.get("text", "")
                        
                        # Check if this span contains our target text
                        if old_value_str in text:
                            print(f"    ✓ Found '{old_value_str}' in text: '{text}'")
                            found_count += text.count(old_value_str)

                            # Get exact formatting details
                            font = span.get("font", "")
                            fontsize_val = span.get("size", 12.0)
                            color_val = span.get("color", 0)
                            
                            # Convert to proper types
                            fontsize = float(fontsize_val) if fontsize_val else 12.0
                            color = int(color_val) if color_val else 0

                            print(
                                f"      Original font: {font}, size: {fontsize:.2f}"
                            )

                            # Convert color from integer to RGB tuple
                            r = float(((color >> 16) & 0xFF) / 255.0)
                            g = float(((color >> 8) & 0xFF) / 255.0)
                            b = float((color & 0xFF) / 255.0)

                            print(f"      Color: RGB({r:.2f}, {g:.2f}, {b:.2f})")

                            # Get bbox (bounding box)
                            bbox = span.get("bbox", (0, 0, 0, 0))
                            rect = fitz.Rect(bbox)

                            print(
                                f"      Position: x={rect.x0:.2f}, y={rect.y0:.2f}"
                            )

                            # Cover old text with white rectangle
                            page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1))

                            # Replace text in the span
                            new_text = text.replace(old_value_str, str(new_value))

                            print(f"      Replacing with: '{new_text}'")

                            # Calculate better vertical position
                            # Use the baseline from the original bbox
                            y_position = rect.y0 + (rect.height * 0.69)

                            # Insert new text with properly embedded font
                            if font_file:
                                print(
                                    f"      🔧 Using font file: {os.path.basename(font_file)}"
                                )
                                try:
                                    # Register font with the page first
                                    with open(font_file, "rb") as f:
                                        font_buffer = f.read()

                                    # Insert font into page - returns xref, we need to give it a name
                                    xref = page.insert_font(
                                        fontbuffer=font_buffer,
                                        fontname="CustomFont",
                                    )
                                    print(
                                        f"      📝 Registered font with xref: {xref}"
                                    )

                                    # Now use "CustomFont" as the font name
                                    page.insert_text(
                                        (rect.x0, y_position),
                                        new_text,
                                        fontname="CustomFont",
                                        fontsize=fontsize,
                                        color=(r, g, b),
                                    )
                                    print(
                                        f"      ✅ Inserted successfully at y={y_position:.2f}"
                                    )
                                except Exception as e:
                                    print(f"      ⚠️  Font embedding failed: {e}")
                                    print(f"      🔧 Falling back to Times Roman")
                                    page.insert_text(
                                        (rect.x0, y_position),
                                        new_text,
                                        fontname="times-roman",
                                        fontsize=fontsize,
                                        color=(r, g, b),
                                    )
                            else:
                                # Fallback to built-in Times font
                                print(f"      🔧 Using built-in Times Roman")
                                page.insert_text(
                                    (rect.x0, y_position),
                                    new_text,
                                    fontname="times-roman",
                                    fontsize=fontsize,
                                    color=(r, g, b),
                                )
                                print(f"      ✅ Inserted using Times Roman")

                            page_replacements += 1
                            total_replacements += 1

            # Update replacement details
            replacement_details[old_value]["count"] += found_count
            replacement_details[old_value]["found"] = found_count > 0
            
            if found_count > 0:
                print(f"    📊 Found {found_count} instance(s) of '{old_value_str}'")
            else:
                print(f"    ℹ️  Number '{old_value_str}' not found in PDF")

        if page_replacements > 0:
            print(
                f"  📝 Made {page_replacements} replacement(s) on page {page_num + 1}"
            )
        else:
            print(f"  ℹ️  No replacements made on page {page_num + 1}")
        print()

    # Save the modified PDF only if replacements were made
    if total_replacements > 0:
        doc.save(output_pdf)
        print(f"✅ PDF saved successfully to {output_pdf}\n")
    else:
        # If no replacements were made, save the original PDF as-is
        doc.save(output_pdf)
        print(f"ℹ️  PDF saved without modifications to {output_pdf}\n")
    
    # Only close the document if we opened it ourselves
    if not authenticated_doc:
        doc.close()
    
    # Return detailed results
    return {
        "total_replacements": total_replacements,
        "replacement_details": replacement_details
    }