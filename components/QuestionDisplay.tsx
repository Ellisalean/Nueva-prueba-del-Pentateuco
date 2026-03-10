
import React, { useState, useEffect, useCallback } from 'react';
import type { Question, UserAnswer, DragItem, TimelineEvent, ChartItem } from '../types';
import { QuestionType } from '../types';
import { Check, X } from 'lucide-react';

interface QuestionDisplayProps {
    question: Question;
    onNext: (answer: UserAnswer) => void;
    questionNumber: number;
    totalQuestions: number;
}

// Helper for shuffling arrays
const shuffleArray = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
};

const getCorrectAnswerText = (question: Question): string => {
    switch (question.type) {
        case QuestionType.MULTIPLE_CHOICE:
            return question.options?.find(o => o.isCorrect)?.text || 'N/A';
        case QuestionType.FILL_IN_THE_BLANK:
            return question.correctAnswer || 'N/A';
        case QuestionType.TRUE_FALSE:
            return question.correctBoolean ? 'Verdadero' : 'Falso';
        default:
            return 'Ver respuestas detalladas.';
    }
};

const getQuestionTypeLabel = (type: QuestionType): string => {
    switch (type) {
        case QuestionType.MULTIPLE_CHOICE: return 'Opción Múltiple';
        case QuestionType.FILL_IN_THE_BLANK: return 'Completar Espacio';
        case QuestionType.TRUE_FALSE: return 'Verdadero o Falso';
        case QuestionType.DRAG_AND_DROP: return 'Arrastrar y Soltar';
        case QuestionType.TIMELINE: return 'Línea de Tiempo';
        case QuestionType.COMPARATIVE_CHART: return 'Cuadro Comparativo';
        default: return 'Pregunta';
    }
};

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ question, onNext, questionNumber, totalQuestions }) => {
    const [answer, setAnswer] = useState<UserAnswer>(null);
    const [shuffledDragItems, setShuffledDragItems] = useState<DragItem[]>([]);
    const [shuffledTimelineEvents, setShuffledTimelineEvents] = useState<TimelineEvent[]>([]);
    const [shuffledChartItems, setShuffledChartItems] = useState<ChartItem[]>([]);

    const [dragAndDropState, setDragAndDropState] = useState<Record<string, string | null>>({});
    const [timelineState, setTimelineState] = useState<TimelineEvent[]>([]);
    const [chartState, setChartState] = useState<Record<string, string | null>>({});
    
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [key, setKey] = useState(question.id);

    useEffect(() => {
        setKey(question.id);
        setAnswer(null);
        setIsSubmitted(false);
        setIsCorrect(false);

        if (question.type === QuestionType.DRAG_AND_DROP && question.dragItems) {
            const initialDndState: Record<string, string | null> = {};
            question.dropTargets?.forEach(t => initialDndState[t.id] = null);
            setDragAndDropState(initialDndState);
            setShuffledDragItems(shuffleArray(question.dragItems));
        }
        if (question.type === QuestionType.TIMELINE && question.timelineEvents) {
            const shuffled = shuffleArray(question.timelineEvents);
            setTimelineState(shuffled);
        }
        if (question.type === QuestionType.COMPARATIVE_CHART && question.chartItems) {
            const initialChartState: Record<string, string | null> = {};
            question.chartItems.forEach(item => initialChartState[item.id] = null);
            setChartState(initialChartState);
            setShuffledChartItems(shuffleArray(question.chartItems));
        }
    }, [question]);

    const handleSubmit = () => {
        let finalAnswer: UserAnswer = answer;
        if (question.type === QuestionType.DRAG_AND_DROP) {
           const mappedAnswer: Record<string, string> = {};
           Object.entries(dragAndDropState).forEach(([targetId, dragId]) => {
                if (dragId) {
                    const dragItem = question.dragItems?.find(d => d.id === dragId);
                    if (dragItem) mappedAnswer[targetId] = dragItem.text;
                }
           });
           finalAnswer = mappedAnswer;
           setAnswer(finalAnswer);
        } else if (question.type === QuestionType.TIMELINE) {
            finalAnswer = timelineState.map(event => event.text);
            setAnswer(finalAnswer);
        } else if(question.type === QuestionType.COMPARATIVE_CHART) {
            finalAnswer = chartState;
            setAnswer(finalAnswer);
        }

        let correct = false;
        switch (question.type) {
            case 'MULTIPLE_CHOICE':
                const selectedOption = question.options?.find(opt => opt.text === finalAnswer);
                if (selectedOption?.isCorrect) correct = true;
                break;
            case 'FILL_IN_THE_BLANK':
                if (typeof finalAnswer === 'string' && finalAnswer.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim()) correct = true;
                break;
            case 'TRUE_FALSE':
                if (finalAnswer === question.correctBoolean) correct = true;
                break;
            case 'DRAG_AND_DROP':
                 if (finalAnswer && typeof finalAnswer === 'object' && !Array.isArray(finalAnswer)) {
                    const correctMatches = question.dragItems?.reduce((acc, item, idx) => {
                        return (finalAnswer as Record<string, string>)[`t${idx+1}`] === item.text ? acc + 1 : acc;
                    }, 0) || 0;
                     if (correctMatches === question.dragItems?.length) correct = true;
                 }
                break;
            case 'TIMELINE':
                if (Array.isArray(finalAnswer)) {
                     const correctPositions = question.timelineEvents?.reduce((acc, event, idx) => {
                        return (finalAnswer as string[]).indexOf(event.text) === event.correctOrder ? acc + 1 : acc;
                     }, 0) || 0;
                     if (correctPositions === question.timelineEvents?.length) correct = true;
                }
                break;
            case 'COMPARATIVE_CHART':
                 if (finalAnswer && typeof finalAnswer === 'object' && !Array.isArray(finalAnswer)) {
                    const correctPlacements = question.chartItems?.reduce((acc, item) => {
                        return (finalAnswer as Record<string, string>)[item.id] === item.category ? acc + 1 : acc;
                    }, 0) || 0;
                    if (correctPlacements === question.chartItems?.length) correct = true;
                 }
                break;
        }
        setIsCorrect(correct);
        setIsSubmitted(true);
    };

    const handleContinue = () => {
        onNext(answer);
    };

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, itemId: string) => {
        e.dataTransfer.setData("itemId", itemId);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
        e.preventDefault();
        const itemId = e.dataTransfer.getData("itemId");
        if(itemId) {
            setDragAndDropState(prev => ({...prev, [targetId]: itemId}));
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const renderQuestionType = () => {
        switch (question.type) {
            case QuestionType.MULTIPLE_CHOICE:
                return (
                    <div className="space-y-4 mt-6">
                        {question.options?.map((option, index) => (
                            <div 
                                key={index} 
                                className="flex items-start gap-4 cursor-pointer group"
                                onClick={() => setAnswer(option.text)}
                            >
                                <div className="mt-1">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${answer === option.text ? 'border-white' : 'border-gray-400 group-hover:border-white'}`}>
                                        {answer === option.text && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                    </div>
                                </div>
                                <span className={`text-lg font-light ${answer === option.text ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                    {option.text}
                                </span>
                            </div>
                        ))}
                    </div>
                );
            case QuestionType.FILL_IN_THE_BLANK:
                 return (
                    <div className="mt-6">
                        <input
                            type="text"
                            value={(answer as string) || ''}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Escribe tu respuesta aquí"
                            className="w-full p-3 bg-transparent border-b-2 border-gray-500 text-white placeholder-gray-500 focus:border-[#4caf50] outline-none transition"
                        />
                    </div>
                );
            case QuestionType.TRUE_FALSE:
                return (
                     <div className="space-y-4 mt-6">
                        <div 
                            className="flex items-start gap-4 cursor-pointer group"
                            onClick={() => setAnswer(true)}
                        >
                            <div className="mt-1">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${answer === true ? 'border-white' : 'border-gray-400 group-hover:border-white'}`}>
                                    {answer === true && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                </div>
                            </div>
                            <span className={`text-lg font-light ${answer === true ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                Verdadero
                            </span>
                        </div>
                        <div 
                            className="flex items-start gap-4 cursor-pointer group"
                            onClick={() => setAnswer(false)}
                        >
                            <div className="mt-1">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${answer === false ? 'border-white' : 'border-gray-400 group-hover:border-white'}`}>
                                    {answer === false && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                </div>
                            </div>
                            <span className={`text-lg font-light ${answer === false ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                Falso
                            </span>
                        </div>
                    </div>
                );
            case QuestionType.DRAG_AND_DROP:
                return (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-bold text-gray-300 mb-3 text-center">Personajes</h3>
                            <div className="space-y-3">
                                {shuffledDragItems.map(item => (
                                    <div key={item.id} draggable onDragStart={(e) => handleDragStart(e, item.id)} className="p-3 bg-[#4a4a4a] text-white rounded-full cursor-grab active:cursor-grabbing text-center shadow-md">
                                        {item.text}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-300 mb-3 text-center">Descripciones</h3>
                            <div className="space-y-3">
                                {question.dropTargets?.map(target => (
                                    <div key={target.id} onDrop={(e) => handleDrop(e, target.id)} onDragOver={handleDragOver} className="p-3 min-h-[60px] bg-[#2a2d2f] border-2 border-dashed border-gray-500 rounded-lg flex items-center justify-between">
                                        <span className="text-gray-400 flex-1 text-sm">{target.text}</span>
                                        {dragAndDropState[target.id] && <div className="ml-2 p-2 bg-[#4caf50] text-white rounded-full text-sm">{question.dragItems?.find(d => d.id === dragAndDropState[target.id])?.text}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
             case QuestionType.TIMELINE:
                return (
                    <div className="mt-6">
                         <p className="text-sm text-gray-400 mb-4">Arrastra los eventos para ordenarlos.</p>
                         <div className="space-y-3">
                             {timelineState.map((event, index) => (
                                 <div key={event.id} draggable onDragStart={(e) => e.dataTransfer.setData("timelineIndex", index.toString())} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
                                     const draggedIndex = parseInt(e.dataTransfer.getData("timelineIndex"), 10);
                                     const newOrder = [...timelineState];
                                     const [draggedItem] = newOrder.splice(draggedIndex, 1);
                                     newOrder.splice(index, 0, draggedItem);
                                     setTimelineState(newOrder);
                                 }} className="p-4 bg-[#4a4a4a] text-white rounded-lg flex items-center cursor-move shadow-md">
                                     <span className="font-bold text-[#4caf50] mr-4">{index + 1}.</span> {event.text}
                                 </div>
                             ))}
                         </div>
                    </div>
                );
            case QuestionType.COMPARATIVE_CHART:
                const handleChartDrop = (e: React.DragEvent<HTMLDivElement>, category: string) => {
                    e.preventDefault();
                    const itemId = e.dataTransfer.getData("itemId");
                    setChartState(prev => ({ ...prev, [itemId]: category }));
                };

                return (
                    <div className="mt-6">
                        <div className="mb-6 p-4 bg-[#2a2d2f] rounded-lg flex flex-wrap gap-3 justify-center">
                            {shuffledChartItems.filter(item => !chartState[item.id]).map(item => (
                                <div key={item.id} draggable onDragStart={(e) => handleDragStart(e, item.id)} className="p-2 bg-[#4a4a4a] text-white rounded-full cursor-grab shadow-md text-sm">
                                    {item.description}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {question.chartCategories?.map(category => (
                                <div key={category} className="p-4 bg-[#2a2d2f] rounded-lg">
                                    <h3 className="font-bold text-[#4caf50] text-center mb-3">{category}</h3>
                                    <div onDrop={(e) => handleChartDrop(e, category)} onDragOver={handleDragOver} className="min-h-[150px] bg-[#1e2022] border border-gray-600 rounded space-y-2 p-2">
                                        {shuffledChartItems.filter(item => chartState[item.id] === category).map(item => (
                                            <div key={item.id} className="p-2 bg-[#4caf50] text-white rounded-full text-sm text-center">{item.description}</div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <div key={key} className="w-full max-w-5xl mx-auto bg-[#373b3e] shadow-2xl flex flex-col md:flex-row min-h-[500px] animate__animated animate__fadeIn">
            {/* Left Panel */}
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col">
                <h3 className="text-[#4caf50] text-xl font-semibold mb-4 uppercase tracking-wider">{getQuestionTypeLabel(question.type)}</h3>
                <h2 className="text-[#4caf50] text-2xl mb-8 font-light leading-snug">{question.questionText}</h2>
                
                <div className="flex-grow">
                    {renderQuestionType()}
                </div>

                {!isSubmitted && (
                    <button
                        onClick={handleSubmit}
                        disabled={answer === null && question.type !== 'DRAG_AND_DROP' && question.type !== 'TIMELINE' && question.type !== 'COMPARATIVE_CHART'}
                        className="mt-12 self-start bg-[#4caf50] hover:bg-[#388e3c] text-white font-bold py-2 px-8 rounded-full transition-colors disabled:bg-[#4a4a4a] disabled:text-[#888] disabled:cursor-not-allowed uppercase tracking-wider text-sm"
                    >
                        SUBMIT
                    </button>
                )}
            </div>

            {/* Right Panel */}
            <div className="w-full md:w-1/2 relative bg-[#2a2d2f]">
                {isSubmitted ? (
                    <div className={`absolute inset-0 p-8 md:p-12 flex flex-col justify-center ${isCorrect ? 'bg-[#388e3c]' : 'bg-[#c65b39]'} text-white animate__animated animate__fadeIn`}>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="bg-white rounded-full p-2">
                                {isCorrect ? <Check className="text-[#388e3c]" size={32} /> : <X className="text-[#c65b39]" size={32} />}
                            </div>
                            <h2 className="text-4xl font-bold">{isCorrect ? 'Correct!' : 'Wrong!'}</h2>
                        </div>
                        <p className="text-xl mb-6 font-light">
                            {isCorrect 
                                ? '¡Sí, lo lograste, elegiste la respuesta correcta. Felicitaciones, buen trabajo!' 
                                : '¡Lo siento! ¡Esta no es la respuesta correcta! ¡Mejor suerte la próxima vez!'}
                        </p>
                        {!isCorrect && (question.type === 'MULTIPLE_CHOICE' || question.type === 'FILL_IN_THE_BLANK' || question.type === 'TRUE_FALSE') && (
                            <p className="text-md opacity-90 font-light">
                                La respuesta correcta era: <span className="font-semibold">{getCorrectAnswerText(question)}</span>
                            </p>
                        )}
                        <button 
                            onClick={handleContinue} 
                            className="mt-auto self-start border-2 border-white hover:bg-white hover:text-[#373b3e] text-white font-bold py-2 px-8 rounded-full transition-colors uppercase tracking-wider text-sm"
                        >
                            CONTINUAR
                        </button>
                    </div>
                ) : (
                    <img src={`https://picsum.photos/seed/${question.id}/800/600`} alt="Context" className="w-full h-full object-cover opacity-80" />
                )}
            </div>
        </div>
    );
};

export default QuestionDisplay;
