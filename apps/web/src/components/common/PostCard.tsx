import React from 'react';
import { motion } from 'motion/react';
import { Post } from '../../pages/Community/types';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className="cursor-pointer rounded-[26px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full bg-gray-100" />
          <div>
            <h3 className="text-sm font-bold text-gray-900">{post.author.name}</h3>
            <p className="text-[10px] text-gray-400">{post.time} · 坐标：{post.author.location}</p>
          </div>
        </div>
        {post.expertReply && (
          <div className="bg-orange-50 text-orange-600 px-2 py-1 rounded-full flex items-center gap-1">
            <span className="text-[10px] font-bold">专家已回复</span>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-700 leading-relaxed mb-4 line-clamp-3">
        {post.content}
      </p>

      {post.images.length > 0 && (
        <div className={`grid gap-2 mb-4 ${post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {post.images.map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden">
              <img src={img} alt="" className="w-full h-full object-cover" />
              {post.images.length > 1 && (
                <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] text-white">
                  Day {idx === 0 ? 1 : 21}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-6">
          <button className="flex items-center gap-1.5 text-gray-400 hover:text-blue-600 transition-colors">
            <Heart size={18} />
            <span className="text-xs font-medium">{post.likes}</span>
          </button>
          <button className="flex items-center gap-1.5 text-gray-400 hover:text-blue-600 transition-colors">
            <MessageCircle size={18} />
            <span className="text-xs font-medium">{post.comments}</span>
          </button>
        </div>
        <button className="text-gray-400 hover:text-blue-600 transition-colors">
          <Share2 size={18} />
        </button>
      </div>
    </motion.article>
  );
};
