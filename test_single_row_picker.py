#!/usr/bin/env python3
"""
Test script to verify that the emoji picker now displays in a single row
and that reaction icons are smaller.
"""

import os
import sys

def test_single_row_improvements():
    """Test that the single row emoji picker improvements are in place"""
    
    print("🧪 Testing Single Row Emoji Picker Improvements")
    print("=" * 60)
    
    # Check if the TaskCommentsTab.tsx file has our single-row improvements
    comments_tab_file = "/app/frontend/src/components/task/TaskCommentsTab.tsx"
    
    if not os.path.exists(comments_tab_file):
        print("❌ TaskCommentsTab.tsx file not found")
        return False
        
    with open(comments_tab_file, 'r') as f:
        content = f.read()
    
    improvements_found = []
    
    # Test 1: Check for single horizontal row layout
    if 'flex items-center justify-center gap-1 overflow-x-auto' in content:
        print("✅ Single horizontal row layout found")
        improvements_found.append("Single row layout")
    else:
        print("❌ Single horizontal row layout not found")
    
    # Test 2: Check for smaller emoji icons in picker  
    if 'text-sm transition-all duration-200' in content and 'p-1.5 hover:bg-blue-50 rounded' in content:
        print("✅ Smaller emoji icons in picker found")
        improvements_found.append("Smaller picker icons")
    else:
        print("❌ Smaller emoji icons in picker not found")
    
    # Test 3: Check for smaller existing reaction icons
    if 'text-sm leading-none' in content:
        print("✅ Smaller existing reaction icons found")
        improvements_found.append("Smaller existing reactions")
    else:
        print("❌ Smaller existing reaction icons not found")
    
    # Test 4: Check for compact picker dimensions
    if 'min-w-[380px] max-w-[420px]' in content:
        print("✅ Compact picker dimensions found")
        improvements_found.append("Compact picker")
    else:
        print("❌ Compact picker dimensions not found")
    
    # Test 5: Check for scrollable horizontal layout
    if 'overflow-x-auto scrollbar-hide' in content:
        print("✅ Scrollable horizontal layout found")
        improvements_found.append("Scrollable layout")
    else:
        print("❌ Scrollable horizontal layout not found")
    
    # Test 6: Check for flex-shrink-0 to prevent emoji squashing
    if 'flex-shrink-0' in content and 'min-w-[28px]' in content:
        print("✅ Anti-squashing emoji layout found")
        improvements_found.append("Anti-squash layout")
    else:
        print("❌ Anti-squashing emoji layout not found")
    
    # Test 7: Check for reduced padding on existing reactions
    if 'px-2 py-1 rounded-lg' in content and 'space-x-1' in content:
        print("✅ Compact existing reaction padding found")
        improvements_found.append("Compact reactions")
    else:
        print("❌ Compact existing reaction padding not found")
    
    # Test 8: Check scrollbar hide CSS
    index_css_file = "/app/frontend/src/index.css"
    if os.path.exists(index_css_file):
        with open(index_css_file, 'r') as f:
            css_content = f.read()
        
        if 'scrollbar-hide' in css_content and 'scrollbar-width: none' in css_content:
            print("✅ Scrollbar hide CSS found")
            improvements_found.append("Scrollbar hide CSS")
        else:
            print("❌ Scrollbar hide CSS not found")
    
    # Summary
    print(f"\n📋 Summary of Single Row Improvements:")
    print("-" * 50)
    
    expected_improvements = [
        "Single horizontal row layout instead of grid",
        "Smaller emoji icons in picker (text-sm vs text-lg)",
        "Smaller existing reaction display (text-sm vs text-base)",
        "Compact picker dimensions (380-420px wide)",
        "Horizontal scrolling for many emojis",
        "Anti-squashing layout with min-width",
        "Reduced padding for compact design",
        "Hidden scrollbars for clean appearance"
    ]
    
    for i, improvement in enumerate(expected_improvements, 1):
        status = "✅" if i <= len(improvements_found) else "⚠️"
        print(f"  {i}. {status} {improvement}")
    
    success_rate = len(improvements_found) / len(expected_improvements) * 100
    
    print(f"\n🎯 Implementation Success Rate: {success_rate:.1f}%")
    print(f"📊 Improvements Implemented: {len(improvements_found)}/{len(expected_improvements)}")
    
    if success_rate >= 80:
        print("🎉 Single row emoji picker successfully implemented!")
        print("\n✨ Key Features:")
        print("  • Emojis now display in one horizontal row")
        print("  • Smaller, more compact icons throughout")
        print("  • Horizontal scrolling for easy navigation")
        print("  • Clean design without visible scrollbars")
        print("  • Consistent smaller sizing for existing reactions")
        return True
    else:
        print("⚠️ Some single row improvements may not be fully implemented")
        return False

if __name__ == "__main__":
    success = test_single_row_improvements()
    sys.exit(0 if success else 1)