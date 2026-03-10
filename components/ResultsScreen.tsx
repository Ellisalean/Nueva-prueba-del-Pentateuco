import React, { useState } from 'react';
import type { Question, UserAnswer } from '../types';
import { QuestionType } from '../types';
import { Download, Send, RotateCcw, Check, X, Paperclip } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ResultsScreenProps {
    studentName: string;
    studentLastName: string;
    score: number;
    totalPoints: number;
    onRestart: () => void;
    questions: Question[];
    userAnswers: UserAnswer[];
}

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

const formatUserAnswer = (question: Question, answer: UserAnswer): string | JSX.Element => {
    if (answer === null || answer === undefined) {
        return <span className="text-gray-500 italic">No respondida</span>;
    }

    switch (question.type) {
        case QuestionType.MULTIPLE_CHOICE:
        case QuestionType.FILL_IN_THE_BLANK:
            return String(answer);
        case QuestionType.TRUE_FALSE:
            return answer ? 'Verdadero' : 'Falso';
        case QuestionType.DRAG_AND_DROP:
             if (typeof answer === 'object' && answer !== null && !Array.isArray(answer)) {
                return (
                    <ul className="list-disc pl-5 mt-1 text-gray-400">
                        {question.dropTargets?.map(target => (
                            <li key={target.id}>
                                <span className="font-medium text-gray-300">{target.text}:</span> {(answer as Record<string, string>)[target.id] || 'Sin respuesta'}
                            </li>
                        ))}
                    </ul>
                );
            }
            return JSON.stringify(answer);
        case QuestionType.TIMELINE:
             if (Array.isArray(answer)) {
                return (
                    <ol className="list-decimal pl-5 mt-1 text-gray-400">
                        {(answer as string[]).map((eventText, index) => (
                            <li key={index}>{eventText}</li>
                        ))}
                    </ol>
                );
            }
            return JSON.stringify(answer);
        case QuestionType.COMPARATIVE_CHART:
             if (typeof answer === 'object' && answer !== null && !Array.isArray(answer)) {
                return (
                     <ul className="list-disc pl-5 mt-1 text-gray-400">
                        {question.chartItems?.map(item => (
                             <li key={item.id}>
                                <span className="font-medium text-gray-300">{item.description}:</span> {(answer as Record<string, string>)[item.id] || 'Sin asignar'}
                             </li>
                        ))}
                     </ul>
                );
            }
            return JSON.stringify(answer);
        default:
            return JSON.stringify(answer);
    }
};

const ResultsScreen: React.FC<ResultsScreenProps> = ({ studentName, studentLastName, score, totalPoints, onRestart, questions, userAnswers }) => {
    const percentage = Math.round((score / totalPoints) * 100);
    const isSuccess = percentage >= 70;
    
    const [isSending, setIsSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState<boolean | null>(null);

    const handleDownloadPDF = async () => {
        const element = document.getElementById('results-content');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#373b3e',
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Resultados_Pentateuco_${studentName}_${studentLastName}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Hubo un error al generar el PDF.');
        }
    };

    const handleSendEmail = async () => {
        setIsSending(true);
        setSendSuccess(null);

        // Generate summary for email
        let answersSummary = '';
        questions.forEach((q, index) => {
            const userAnswer = userAnswers[index];
            let isCorrect = false;
            if (q.type === QuestionType.MULTIPLE_CHOICE) {
                 isCorrect = q.options?.find(opt => opt.text === userAnswer)?.isCorrect || false;
            } else if (q.type === QuestionType.FILL_IN_THE_BLANK) {
                isCorrect = typeof userAnswer === 'string' && userAnswer.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim();
            } else if (q.type === QuestionType.TRUE_FALSE) {
                isCorrect = userAnswer === q.correctBoolean;
            }

            answersSummary += `${index + 1}. ${q.questionText}\n`;
            answersSummary += `Tu respuesta: ${JSON.stringify(userAnswer)}\n`;
            if (!isCorrect && (q.type === 'MULTIPLE_CHOICE' || q.type === 'FILL_IN_THE_BLANK' || q.type === 'TRUE_FALSE')) {
                answersSummary += `Respuesta correcta: ${getCorrectAnswerText(q)}\n`;
            }
            answersSummary += '\n';
        });

        try {
            const response = await fetch('/api/send-results', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: studentName,
                    lastName: studentLastName,
                    subject: 'El Pentateuco',
                    score,
                    totalPoints,
                    percentage,
                    answersSummary
                }),
            });

            if (response.ok) {
                setSendSuccess(true);
            } else {
                setSendSuccess(false);
            }
        } catch (error) {
            console.error('Error sending email:', error);
            setSendSuccess(false);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-[#373b3e] p-10 md:p-16 shadow-2xl animate__animated animate__fadeIn relative">
            <div className="absolute top-8 right-8 text-[#c65b39]">
                <Paperclip size={48} className="opacity-80" />
            </div>
            
            <div id="results-content" className="bg-[#373b3e]">
                <div className="flex items-center gap-6 mb-8">
                    <div className="bg-white rounded-full p-3">
                        {isSuccess ? <Check className="text-[#388e3c]" size={40} /> : <X className="text-[#c65b39]" size={40} />}
                    </div>
                    <h1 className={`text-4xl md:text-5xl font-light ${isSuccess ? 'text-[#4caf50]' : 'text-[#c65b39]'}`}>
                        {isSuccess ? 'Test success!' : 'Test fail!'}
                    </h1>
                </div>

                <p className="text-white text-lg mb-12 font-light">
                    {isSuccess 
                        ? `¡Felicidades ${studentName}! Has aprobado el examen con un ${percentage}%.` 
                        : `Lo siento ${studentName}, no has aprobado este examen. Tu puntuación fue del ${percentage}%.`}
                </p>

                <div className="my-8 text-left">
                    <h2 className="text-2xl font-light text-[#4caf50] mb-4">Resumen de Respuestas</h2>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                        {questions.map((q, index) => {
                            const userAnswer = userAnswers[index];
                            let isCorrect = false;
                            
                            if (q.type === QuestionType.MULTIPLE_CHOICE) {
                                 isCorrect = q.options?.find(opt => opt.text === userAnswer)?.isCorrect || false;
                            } else if (q.type === QuestionType.FILL_IN_THE_BLANK) {
                                isCorrect = typeof userAnswer === 'string' && userAnswer.toLowerCase().trim() === q.correctAnswer?.toLowerCase().trim();
                            } else if (q.type === QuestionType.TRUE_FALSE) {
                                isCorrect = userAnswer === q.correctBoolean;
                            }
                            
                            return (
                                <div key={q.id} className={`p-4 rounded-lg border-l-4 ${isCorrect ? 'bg-[#2a2d2f] border-[#4caf50]' : 'bg-[#2a2d2f] border-[#c65b39]'}`}>
                                    <p className="font-light text-white">{index + 1}. {q.questionText}</p>
                                    <div className="text-sm mt-2 text-gray-300">
                                        <span className="font-semibold text-gray-400">Tu respuesta: </span> 
                                        {formatUserAnswer(q, userAnswer)}
                                    </div>
                                    {!isCorrect && (q.type === 'MULTIPLE_CHOICE' || q.type === 'FILL_IN_THE_BLANK' || q.type === 'TRUE_FALSE') &&
                                    <p className="text-sm mt-2 text-[#4caf50]">
                                        <span className="font-semibold">Respuesta correcta:</span> {getCorrectAnswerText(q)}
                                    </p>
                                    }
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-12">
                <button onClick={onRestart} className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white font-bold py-3 px-6 rounded-full text-sm uppercase tracking-wider transition-colors flex items-center gap-2">
                    <RotateCcw size={18} />
                    Repeat the course
                </button>
                <button onClick={handleDownloadPDF} className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white font-bold py-3 px-6 rounded-full text-sm uppercase tracking-wider transition-colors flex items-center gap-2">
                    <Download size={18} />
                    Descargar PDF
                </button>
                <button onClick={handleSendEmail} disabled={isSending || sendSuccess === true} className={`bg-[#2e7d32] hover:bg-[#1b5e20] text-white font-bold py-3 px-6 rounded-full text-sm uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}>
                    <Send size={18} />
                    {isSending ? 'Enviando...' : sendSuccess ? '¡Enviado!' : 'Enviar Prueba'}
                </button>
            </div>
            {sendSuccess === false && (
                <p className="text-[#c65b39] mt-4 text-sm font-light">Hubo un error al enviar la prueba. Por favor, verifica la configuración del servidor.</p>
            )}
        </div>
    );
};

export default ResultsScreen;