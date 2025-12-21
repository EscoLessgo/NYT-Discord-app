import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Bug, Lightbulb, Send, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Submission {
    id: string;
    type: 'bug' | 'suggestion';
    title: string;
    description: string;
    timestamp: string;
    author: string;
}

const Suggestions = () => {
    const [activeTab, setActiveTab] = useState<'bug' | 'suggestion'>('bug');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [author, setAuthor] = useState('');
    const [submissions, setSubmissions] = useState<Submission[]>(() => {
        const saved = localStorage.getItem('suggestions');
        return saved ? JSON.parse(saved) : [];
    });
    const { toast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !description.trim() || !author.trim()) {
            toast({
                title: "Missing Information",
                description: "Please fill in all fields",
                variant: "destructive",
            });
            return;
        }

        const newSubmission: Submission = {
            id: Date.now().toString(),
            type: activeTab,
            title: title.trim(),
            description: description.trim(),
            author: author.trim(),
            timestamp: new Date().toISOString(),
        };

        const updated = [newSubmission, ...submissions];
        setSubmissions(updated);
        localStorage.setItem('suggestions', JSON.stringify(updated));

        toast({
            title: "Submitted!",
            description: `Your ${activeTab === 'bug' ? 'bug report' : 'suggestion'} has been recorded.`,
        });

        setTitle('');
        setDescription('');
        setAuthor('');
    };

    const handleDelete = (id: string) => {
        const updated = submissions.filter(s => s.id !== id);
        setSubmissions(updated);
        localStorage.setItem('suggestions', JSON.stringify(updated));

        toast({
            title: "Deleted",
            description: "Submission removed",
        });
    };

    const filteredSubmissions = submissions.filter(s => s.type === activeTab);

    return (
        <div className="relative z-20 min-h-screen bg-black text-white p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                        Feedback Center
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Help us improve! Report bugs or share your ideas.
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab('bug')}
                        className={`flex-1 py-4 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-3 ${activeTab === 'bug'
                            ? 'bg-red-500/20 border-2 border-red-500 text-red-400'
                            : 'bg-gray-800 border-2 border-gray-700 text-gray-400 hover:border-gray-600'
                            }`}
                    >
                        <Bug className="w-6 h-6" />
                        Bug Reports
                    </button>
                    <button
                        onClick={() => setActiveTab('suggestion')}
                        className={`flex-1 py-4 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-3 ${activeTab === 'suggestion'
                            ? 'bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400'
                            : 'bg-gray-800 border-2 border-gray-700 text-gray-400 hover:border-gray-600'
                            }`}
                    >
                        <Lightbulb className="w-6 h-6" />
                        Suggestions
                    </button>
                </div>

                {/* Submission Form */}
                <Card className="p-6 mb-8 bg-gray-900 border-gray-800">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-300">
                                Your Name
                            </label>
                            <Input
                                id="author-input"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                placeholder="Enter your name..."
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-300">
                                {activeTab === 'bug' ? 'Bug Title' : 'Suggestion Title'}
                            </label>
                            <Input
                                id="title-input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={activeTab === 'bug' ? "Brief description of the bug..." : "What's your idea?"}
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-300">
                                Details
                            </label>
                            <Textarea
                                id="description-textarea"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={activeTab === 'bug' ? "Steps to reproduce, expected vs actual behavior..." : "Describe your suggestion in detail..."}
                                rows={4}
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none"
                            />
                        </div>

                        <Button
                            id="submit-feedback-button"
                            type="submit"
                            className={`w-full ${activeTab === 'bug'
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-yellow-500 hover:bg-yellow-600 text-black'
                                } font-semibold text-lg py-6`}
                        >
                            <Send className="w-5 h-5 mr-2" />
                            Submit {activeTab === 'bug' ? 'Bug Report' : 'Suggestion'}
                        </Button>
                    </form>
                </Card>

                {/* Submissions List */}
                <div>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        {activeTab === 'bug' ? (
                            <>
                                <Bug className="w-6 h-6 text-red-400" />
                                <span className="text-red-400">Recent Bug Reports</span>
                            </>
                        ) : (
                            <>
                                <Lightbulb className="w-6 h-6 text-yellow-400" />
                                <span className="text-yellow-400">Recent Suggestions</span>
                            </>
                        )}
                        <span className="text-gray-500 text-lg ml-2">({filteredSubmissions.length})</span>
                    </h2>

                    {filteredSubmissions.length === 0 ? (
                        <Card className="p-8 bg-gray-900 border-gray-800 text-center">
                            <p className="text-gray-500">
                                No {activeTab === 'bug' ? 'bug reports' : 'suggestions'} yet. Be the first to contribute!
                            </p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {filteredSubmissions.map((submission) => (
                                <Card
                                    key={submission.id}
                                    className={`p-6 ${submission.type === 'bug'
                                        ? 'bg-red-500/5 border-red-500/20'
                                        : 'bg-yellow-500/5 border-yellow-500/20'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-xl mb-1">{submission.title}</h3>
                                            <div className="flex items-center gap-3 text-sm text-gray-400">
                                                <span>By {submission.author}</span>
                                                <span>•</span>
                                                <span>{new Date(submission.timestamp).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <Button
                                            id={`delete-${submission.id}`}
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(submission.id)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <p className="text-gray-300 whitespace-pre-wrap">{submission.description}</p>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Suggestions;
