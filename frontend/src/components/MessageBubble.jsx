import ReactMarkdown from 'react-markdown'

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex animate-slide-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar do coach */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-movara-500 to-movara-700 flex items-center justify-center text-sm mr-2 mt-1 shadow-sm">
          🦵
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-movara-600 text-white rounded-tr-sm'
            : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm leading-relaxed prose-chat">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {/* Timestamp */}
        {message.timestamp && (
          <p className={`text-xs mt-1 ${isUser ? 'text-movara-200' : 'text-gray-400'} text-right`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Avatar do usuário */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm ml-2 mt-1">
          👤
        </div>
      )}
    </div>
  )
}
