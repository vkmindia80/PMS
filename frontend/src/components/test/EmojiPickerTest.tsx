import React, { useState } from 'react';
import { Smile, X } from 'lucide-react';

const EmojiPickerTest: React.FC = () => {
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const emojis = ['👍', '👎', '❤️', '😍', '😄', '😮', '😢', '😡', '🎉', '🚀', '👀', '🔥'];

  const handleAddReaction = (emoji: string) => {
    console.log(`Selected emoji: ${emoji}`);
    alert(`You selected: ${emoji}`);
    setShowEmojiPicker(false);
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Emoji Picker Test</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
        <h3 className="text-lg font-semibold mb-4">Test Comment</h3>
        <p className="text-gray-700 mb-4">
          This is a test comment to check if the emoji picker works correctly.
        </p>
        
        <div className="flex items-center gap-3">
          <button className="px-3 py-1.5 text-sm text-blue-600 border border-gray-200 rounded-lg hover:bg-blue-50">
            Reply
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`flex items-center space-x-1.5 text-sm px-3 py-1.5 rounded-lg transition-all duration-200 border font-medium shadow-sm hover:shadow-md ${
                showEmojiPicker 
                  ? 'text-blue-700 bg-blue-100 border-blue-400' 
                  : 'text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border-gray-200 hover:border-blue-300'
              }`}
            >
              <Smile className="h-4 w-4" />
              <span className="text-xs font-semibold">React</span>
            </button>
            
            {showEmojiPicker && (
              <>
                <div 
                  className="fixed inset-0 bg-black bg-opacity-10 z-[9998]" 
                  onClick={() => setShowEmojiPicker(false)}
                />
                <div className="absolute left-0 top-12 bg-white border-2 border-gray-400 rounded-lg shadow-xl z-[99999] p-3 min-w-[380px] max-w-[420px]"
                     style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700 bg-blue-50 px-2 py-1 rounded">Pick a reaction</span>
                    <button
                      onClick={() => setShowEmojiPicker(false)}
                      className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-1 overflow-x-auto scrollbar-hide">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleAddReaction(emoji)}
                        className="p-1.5 hover:bg-blue-50 rounded text-sm transition-all duration-200 hover:scale-110 transform active:scale-95 focus:ring-1 focus:ring-blue-300 focus:outline-none border border-transparent hover:border-blue-200 hover:shadow-sm min-w-[28px] flex-shrink-0"
                        title={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Debug Info:</strong></p>
          <p>Picker Open: {showEmojiPicker ? 'Yes' : 'No'}</p>
          <p>Emojis Count: {emojis.length}</p>
        </div>
      </div>
    </div>
  );
};

export default EmojiPickerTest;