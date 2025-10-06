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
                <div className="absolute left-0 top-12 bg-white border border-gray-200 rounded-xl shadow-2xl z-[99999] p-4 min-w-[400px] max-w-[440px] animate-in fade-in zoom-in duration-200"
                     style={{ 
                       boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                       backdropFilter: 'blur(8px)'
                     }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-gray-800">Pick a reaction</span>
                    </div>
                    <button
                      onClick={() => setShowEmojiPicker(false)}
                      className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
                    >
                      <X className="h-4 w-4 group-hover:rotate-90 transition-transform duration-200" />
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-2 mb-3">
                    <div className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide">
                      {emojis.map((emoji, index) => (
                        <button
                          key={emoji}
                          onClick={() => handleAddReaction(emoji)}
                          className="group relative p-3 hover:bg-white rounded-xl text-lg transition-all duration-300 hover:scale-110 hover:-translate-y-1 active:scale-95 focus:ring-2 focus:ring-blue-400 focus:outline-none border-2 border-transparent hover:border-gray-200 hover:shadow-lg min-w-[44px] h-[44px] flex-shrink-0 flex items-center justify-center"
                          title={`React with ${emoji}`}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <span className="relative z-10 group-hover:animate-bounce" style={{ animationDuration: '0.6s' }}>
                            {emoji}
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center text-xs text-gray-500 space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-gray-300 rounded-full animate-pulse"></div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <span>Click to react</span>
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