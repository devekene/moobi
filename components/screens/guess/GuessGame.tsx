"use client"

import {useEffect, useState} from "react"
import {Button} from "@/components/ui/button"
import {LuArrowDown, LuArrowUp, LuBrain, LuCheck, LuPlay} from "react-icons/lu";
import {cn} from "@/lib/utils";

type GameState = "loading" | "setup" | "playing" | "finished"
type GuessResult = 'lower' | 'higher' | 'correct'

interface Guess {
    number: number;
    result: GuessResult
    timestamp: Date
}

const GuessGame = () => {
    const [gameState, setGameState] = useState<GameState>("loading")
    const [computerNumber, setComputerNumber] = useState<number | null>(null)
    const [inputValue, setInputValue] = useState("")
    const [guesses, setGuesses] = useState<Guess[]>([])
    const [currentGuess, setCurrentGuess] = useState<number | null>(null)
    const [attempts, setAttempts] = useState(0)

    useEffect(() => {
        if(gameState === 'loading') {
            const loadingInterval = setInterval(() => {

                setGameState("setup")
            }, 4000)

            return () => clearInterval(loadingInterval)
        }
    }, [gameState])

    const startGame = () => {
        const computerGuess = Math.floor(Math.random() * 100) + 1

        setComputerNumber(computerGuess)
        setGameState("playing")
        setGuesses([])
    }

    const handleUserResponse = () => {
        const userGuess = Number.parseInt(inputValue)

        if (!userGuess || !computerNumber) return

        let guessResult: GuessResult

        if(userGuess < computerNumber) {
            guessResult = 'lower'
        } else if (userGuess > computerNumber)  {
            guessResult = 'higher'
        } else if (userGuess === computerNumber)  {
            guessResult = 'correct'
        }

        console.log(currentGuess)

        setCurrentGuess(userGuess)
        setGuesses((prev) => [{number: userGuess, result: guessResult, timestamp: new Date()}, ...prev])

        setAttempts((prev) => prev + 1)

        if(userGuess === computerNumber) {
            setGameState("finished")
            return
        }
    }

    const resetGame = () => {
        setGameState("setup")
        setComputerNumber(null)
        setInputValue("")
        setGuesses([])
        setCurrentGuess(null)
        setAttempts(0)
    }

    const getResultIcon = (result?: GuessResult) => {
        switch (result) {
            case "higher":
                return <LuArrowDown className="w-4 h-4 text-red-500" />
            case "lower":
                return <LuArrowUp className="w-4 h-4 text-blue-500" />
            case "correct":
                return <LuCheck className="w-4 h-4 text-green-500" />
            default:
                return <div className="w-4 h-4 bg-yellow-400 rounded-full animate-pulse" />
        }
    }

    const getResultText = (result?: GuessResult) => {
        switch (result) {
            case "higher":
                return "Go low"
            case "lower":
                return "Go High"
            case "correct":
                return "Correct!"
            default:
                return "Waiting..."
        }
    }

    return (
        <div className={cn("relative w-full px-3 bg-white", gameState !== "playing" && "flex-center")}>
            {/* Setup Screen */}
            {gameState === "loading" && (
                <div className="flex-1 flex-center">
                        <LuBrain className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulseCustom" />
                </div>
            )}

            {gameState === "setup" && (
                <div className="flex-1 flex flex-col space-y-6">
                    <div className="text-center">
                        <LuBrain className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Guess My Number</h2>
                        <p className="text-gray-600 mb-6">I&apos;ve thought of a number between 1 and 100. Can you guess it?</p>
                    </div>

                    <Button onClick={startGame} className="w-full bg-blue-500 hover:bg-blue-600" size="lg">
                        <LuPlay className="w-4 h-4 mr-2" />
                        Start Guessing!
                    </Button>
                </div>
            )}

            {/* Playing Screen */}
            {gameState === "playing" && (
                <div className="flex-1 flex flex-col mt-12">
                    <div className="bg-gradient-to-tr from-blue-50 via-pink-50 to-blue-50 rounded-xl p-6 my-4 text-center flex flex-col gap-4 items-center">
                        <div className="flex items-center justify-center gap-2">
                            <LuBrain className="w-6 h-6 text-blue-500" />
                            <span className="text-lg font-semibold text-gray-800">Your Guess</span>
                        </div>

                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="text-center text-lg w-32 p-2 bg-transparent border border-primary rounded-lg focus:outline-none"
                        />

                        <Button
                            onClick={handleUserResponse}
                            className="bg-blue-500 hover:bg-blue-600 text-white py-4"
                            size="sm"
                        >
                            Submit
                        </Button>
                    </div>

                    {/* Guess History */}
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Guess History</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto no-visible-scrollbar">
                            {guesses.map((guess, index) => (
                                <div
                                    key={index}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${
                                        index === guesses.length - 1 && !guess.result
                                            ? "bg-yellow-50 border-yellow-200"
                                            : guess.result === "correct"
                                                ? "bg-green-50 border-green-200"
                                                : "bg-gray-50 border-gray-200"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-gray-500">#{guesses.length - index}</span>
                                        <span className="text-lg font-semibold text-gray-800">{guess.number}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getResultIcon(guess.result)}
                                        <span className="text-sm font-medium text-gray-600">{getResultText(guess.result)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Finished Screen */}
            {gameState === "finished" && (
                <div className="flex-1 flex-center flex-col space-y-6">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LuCheck className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Congrats!</h2>
                        <p className="text-gray-600 mb-4">
                          You guessed my number <span className="font-bold text-green-600">{computerNumber}</span> in{" "}
                            <span className="font-bold">{attempts}</span> attempt{attempts !== 1 ? "s" : ""}!
                        </p>
                    </div>

                    {/* Final Stats */}
                    <div className="bg-gray-50 rounded-xl p-4 w-full max-w-xs">
                        <h3 className="font-semibold text-gray-800 mb-3 text-center">Game Stats</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">My Number:</span>
                                <span className="font-semibold">{computerNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Attempts:</span>
                                <span className="font-semibold">{attempts}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Efficiency:</span>
                                <span className="font-semibold">
          {attempts <= 7 ? "Excellent" : attempts <= 10 ? "Good" : "Fair"}
        </span>
                            </div>
                        </div>
                    </div>

                    <Button onClick={resetGame} className="bg-blue-500 hover:bg-blue-600" size="lg">
                        <LuPlay className="w-4 h-4 mr-2" />
                        Play Again
                    </Button>
                </div>
            )}
        </div>
    )
}

export default GuessGame
