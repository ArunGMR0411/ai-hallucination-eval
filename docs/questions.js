/**
 * AI Hallucination Evaluation — Test Dataset
 * 
 * 100 carefully curated questions across two evaluation modes:
 *   Mode 1: Python Code Execution (50 questions)
 *   Mode 2: Knowledge-Based Questions (50 questions)
 *
 * Author: Arun Narayanan
 * Institution: School of Computing, Dublin City University
 * License: MIT
 */

"use strict";

var PYTHON_QUESTIONS = [
  // --- Edge Cases (15) ---
  { id: 1,  category: "EdgeCase",      question: "Write code that prints the result of 0.1 plus 0.2 equals 0.3",                                          expectedOutput: "False",  difficulty: "Hard"   },
  { id: 2,  category: "EdgeCase",      question: "Write code that prints the result of empty list equals False",                                            expectedOutput: "False",  difficulty: "Hard"   },
  { id: 3,  category: "EdgeCase",      question: "Write code that checks if -0 equals 0 and prints the result",                                            expectedOutput: "True",   difficulty: "Hard"   },
  { id: 4,  category: "EdgeCase",      question: "Write code that prints the result of comparing None with 0 using ==",                                    expectedOutput: "False",  difficulty: "Medium" },
  { id: 5,  category: "EdgeCase",      question: "Write code that prints what happens when you divide 1 by 0.0 (catch the error and print inf)",           expectedOutput: "inf",    difficulty: "Hard"   },
  { id: 6,  category: "EdgeCase",      question: "Write code that prints the type name of NaN (not a number) value created by float nan lowercase",        expectedOutput: "float",  difficulty: "Medium" },
  { id: 7,  category: "EdgeCase",      question: "Write code that prints True if empty string is falsy in Python",                                         expectedOutput: "True",   difficulty: "Medium" },
  { id: 8,  category: "EdgeCase",      question: "Write code that compares two identical lists using is operator and prints the result",                    expectedOutput: "False",  difficulty: "Hard"   },
  { id: 9,  category: "EdgeCase",      question: "Write code that prints the integer value of True",                                                       expectedOutput: "1",      difficulty: "Medium" },
  { id: 10, category: "EdgeCase",      question: "Write code that multiplies a string hello by 0 and prints the length of result",                         expectedOutput: "0",      difficulty: "Medium" },
  { id: 11, category: "EdgeCase",      question: "Write code that prints the result of bool empty dictionary",                                             expectedOutput: "False",  difficulty: "Medium" },
  { id: 12, category: "EdgeCase",      question: "Write code that compares string 10 with integer 10 using == and prints result",                          expectedOutput: "False",  difficulty: "Medium" },
  { id: 13, category: "EdgeCase",      question: "Write code that prints the value of None or 0 or empty string or 42",                                   expectedOutput: "42",     difficulty: "Hard"   },
  { id: 14, category: "EdgeCase",      question: "Write code that creates integer division of 7 by 2 and prints result",                                   expectedOutput: "3",      difficulty: "Easy"   },
  { id: 15, category: "EdgeCase",      question: "Write code that prints the modulo of -10 by 3",                                                         expectedOutput: "2",      difficulty: "Hard"   },

  // --- String Tricks (10) ---
  { id: 16, category: "StringTrick",   question: "Write code that reverses the string stressed and prints it",                                             expectedOutput: "desserts",   difficulty: "Easy"   },
  { id: 17, category: "StringTrick",   question: "Write code that counts uppercase letters in the string PyThOn and prints count",                         expectedOutput: "3",          difficulty: "Medium" },
  { id: 18, category: "StringTrick",   question: "Write code that removes all spaces from the string  hello  world  and prints result without using replace", expectedOutput: "helloworld", difficulty: "Hard"   },
  { id: 19, category: "StringTrick",   question: "Write code that checks if string racecar reads same backwards and forwards case-insensitive and prints result", expectedOutput: "True", difficulty: "Medium" },
  { id: 20, category: "StringTrick",   question: "Write code that finds the character at index -1 in string python and prints it",                         expectedOutput: "n",          difficulty: "Easy"   },
  { id: 21, category: "StringTrick",   question: "Write code that counts consonants in the string programming and prints the count",                       expectedOutput: "8",          difficulty: "Hard"   },
  { id: 22, category: "StringTrick",   question: "Write code that converts string 101 from binary to decimal integer and prints it",                       expectedOutput: "5",          difficulty: "Hard"   },
  { id: 23, category: "StringTrick",   question: "Write code that checks if string abc123 contains only alphanumeric characters and prints result",        expectedOutput: "True",       difficulty: "Medium" },
  { id: 24, category: "StringTrick",   question: "Write code that finds the longest word in the string the quick brown fox and prints it",                 expectedOutput: "quick",      difficulty: "Medium" },
  { id: 25, category: "StringTrick",   question: "Write code that swaps case of all letters in PyThOn and prints result",                                  expectedOutput: "pYtHoN",     difficulty: "Medium" },

  // --- Algorithms (15) ---
  { id: 26, category: "Algorithm",     question: "Write code that finds the missing number in list [1,2,4,5,6] from 1 to 6 and prints it",                expectedOutput: "3",              difficulty: "Hard"   },
  { id: 27, category: "Algorithm",     question: "Write code that checks if 1 is prime and prints True or False",                                         expectedOutput: "False",          difficulty: "Hard"   },
  { id: 28, category: "Algorithm",     question: "Write code that finds second smallest number in [5,2,8,2,9,1] and prints it",                           expectedOutput: "2",              difficulty: "Hard"   },
  { id: 29, category: "Algorithm",     question: "Write code that counts perfect squares between 1 and 100 inclusive and prints count",                    expectedOutput: "10",             difficulty: "Medium" },
  { id: 30, category: "Algorithm",     question: "Write code that finds GCD of 0 and 5 and prints it",                                                    expectedOutput: "5",              difficulty: "Hard"   },
  { id: 31, category: "Algorithm",     question: "Write code that prints the sum of first 10 odd numbers",                                                expectedOutput: "100",            difficulty: "Medium" },
  { id: 32, category: "Algorithm",     question: "Write code that checks if number 121 is palindrome and prints True or False",                           expectedOutput: "True",           difficulty: "Medium" },
  { id: 33, category: "Algorithm",     question: "Write code that finds factorial of 0 and prints it",                                                    expectedOutput: "1",              difficulty: "Hard"   },
  { id: 34, category: "Algorithm",     question: "Write code that counts digits in number -12345 and prints count",                                       expectedOutput: "5",              difficulty: "Medium" },
  { id: 35, category: "Algorithm",     question: "Write code that finds LCM of 12 and 18 and prints it",                                                  expectedOutput: "36",             difficulty: "Hard"   },
  { id: 36, category: "Algorithm",     question: "Write code that checks if 561 is a Carmichael number by testing if n divides a^n - a for a=2 and prints result", expectedOutput: "True",  difficulty: "Hard"   },
  { id: 37, category: "Algorithm",     question: "Write code that rotates list [1,2,3,4,5] right by 2 positions and prints result",                       expectedOutput: "[4, 5, 1, 2, 3]", difficulty: "Hard" },
  { id: 38, category: "Algorithm",     question: "Write code that finds the mode (most frequent number) in [1,2,2,3,3,3] and prints it",                  expectedOutput: "3",              difficulty: "Medium" },
  { id: 39, category: "Algorithm",     question: "Write code that converts decimal 10 to hexadecimal lowercase and prints it",                            expectedOutput: "a",              difficulty: "Medium" },
  { id: 40, category: "Algorithm",     question: "Write code that finds sum of divisors of 12 excluding 12 itself and prints it",                         expectedOutput: "16",             difficulty: "Hard"   },

  // --- Data Structures (10) ---
  { id: 41, category: "DataStructure", question: "Write code that finds symmetric difference between sets {1,2,3} and {2,3,4} as sorted list and prints it",    expectedOutput: "[1, 4]",             difficulty: "Hard"   },
  { id: 42, category: "DataStructure", question: "Write code that flattens nested list [[1,2],[3,4],[5]] and prints result",                                     expectedOutput: "[1, 2, 3, 4, 5]",   difficulty: "Medium" },
  { id: 43, category: "DataStructure", question: "Write code that finds all keys in dictionary with value 2: {a:1, b:2, c:2, d:3} and prints sorted list",      expectedOutput: "['b', 'c']",         difficulty: "Hard"   },
  { id: 44, category: "DataStructure", question: "Write code that removes every second element from [1,2,3,4,5,6] and prints result",                           expectedOutput: "[1, 3, 5]",          difficulty: "Medium" },
  { id: 45, category: "DataStructure", question: "Write code that finds intersection of three lists [1,2,3] and [2,3,4] and [3,4,5] and prints result",         expectedOutput: "[3]",                difficulty: "Hard"   },
  { id: 46, category: "DataStructure", question: "Write code that counts how many times each letter appears in mississippi and prints count for letter i",       expectedOutput: "4",                  difficulty: "Medium" },
  { id: 47, category: "DataStructure", question: "Write code that transposes matrix [[1,2],[3,4]] and prints result",                                           expectedOutput: "[[1, 3], [2, 4]]",  difficulty: "Hard"   },
  { id: 48, category: "DataStructure", question: "Write code that finds the kth smallest element where k=2 in unsorted list [7,10,4,3,20,15] and prints it",    expectedOutput: "4",                  difficulty: "Hard"   },
  { id: 49, category: "DataStructure", question: "Write code that groups anagrams: returns True if listen and silent are anagrams",                              expectedOutput: "True",               difficulty: "Medium" },
  { id: 50, category: "DataStructure", question: "Write code that finds longest increasing subarray length in [1,2,1,2,3,4,2] and prints it",                   expectedOutput: "4",                  difficulty: "Hard"   }
];

var KNOWLEDGE_QUESTIONS = [
  // --- Polars (15) ---
  { id: 1,  category: "Polars",    question: "What Polars method scans a CSV file lazily without loading into memory?",                         expectedOutput: "scan_csv",     difficulty: "Medium" },
  { id: 2,  category: "Polars",    question: "What Polars method triggers execution of a lazy query plan?",                                     expectedOutput: "collect",      difficulty: "Easy"   },
  { id: 3,  category: "Polars",    question: "What Polars expression selects all columns except specified ones?",                               expectedOutput: "exclude",      difficulty: "Medium" },
  { id: 4,  category: "Polars",    question: "What Polars method creates a new column based on a condition without if-else?",                   expectedOutput: "when",         difficulty: "Medium" },
  { id: 5,  category: "Polars",    question: "What Polars method performs a join and keeps all rows from both DataFrames?",                     expectedOutput: "join_outer",   difficulty: "Hard"   },
  { id: 6,  category: "Polars",    question: "What Polars expression applies a function over a sliding window?",                               expectedOutput: "rolling",      difficulty: "Hard"   },
  { id: 7,  category: "Polars",    question: "What Polars method converts eager DataFrame to lazy for query optimization?",                     expectedOutput: "lazy",         difficulty: "Easy"   },
  { id: 8,  category: "Polars",    question: "What Polars expression filters rows within each group separately?",                              expectedOutput: "filter",       difficulty: "Medium" },
  { id: 9,  category: "Polars",    question: "What Polars method pivots longer format to wider without aggregation?",                           expectedOutput: "pivot",        difficulty: "Hard"   },
  { id: 10, category: "Polars",    question: "What Polars expression performs element-wise operations across columns?",                         expectedOutput: "struct",       difficulty: "Hard"   },
  { id: 11, category: "Polars",    question: "What Polars method explodes a list column into multiple rows?",                                   expectedOutput: "explode",      difficulty: "Medium" },
  { id: 12, category: "Polars",    question: "What Polars expression casts column to a different data type?",                                   expectedOutput: "cast",         difficulty: "Easy"   },
  { id: 13, category: "Polars",    question: "What Polars method samples random rows with replacement option?",                                 expectedOutput: "sample",       difficulty: "Medium" },
  { id: 14, category: "Polars",    question: "What Polars expression applies string operations on UTF-8 columns?",                             expectedOutput: "str",          difficulty: "Easy"   },
  { id: 15, category: "Polars",    question: "What Polars method performs anti-join keeping only non-matching rows?",                           expectedOutput: "join_anti",    difficulty: "Hard"   },

  // --- SQL (15) ---
  { id: 16, category: "SQL",       question: "What SQL keyword retrieves unique values from a column?",                                         expectedOutput: "DISTINCT",         difficulty: "Easy"   },
  { id: 17, category: "SQL",       question: "What SQL clause filters results based on conditions?",                                            expectedOutput: "WHERE",            difficulty: "Easy"   },
  { id: 18, category: "SQL",       question: "What SQL keyword combines rows from two or more tables based on related column?",                 expectedOutput: "JOIN",             difficulty: "Easy"   },
  { id: 19, category: "SQL",       question: "What SQL function returns the number of rows in a result set?",                                   expectedOutput: "COUNT",            difficulty: "Easy"   },
  { id: 20, category: "SQL",       question: "What SQL clause groups rows that have the same values?",                                          expectedOutput: "GROUP BY",         difficulty: "Medium" },
  { id: 21, category: "SQL",       question: "What SQL clause filters grouped results?",                                                        expectedOutput: "HAVING",           difficulty: "Medium" },
  { id: 22, category: "SQL",       question: "What SQL keyword sorts query results?",                                                           expectedOutput: "ORDER BY",         difficulty: "Easy"   },
  { id: 23, category: "SQL",       question: "What SQL function returns the maximum value in a column?",                                        expectedOutput: "MAX",              difficulty: "Easy"   },
  { id: 24, category: "SQL",       question: "What SQL keyword returns rows from the first query that are not in the second?",                  expectedOutput: "EXCEPT",           difficulty: "Hard"   },
  { id: 25, category: "SQL",       question: "What SQL constraint ensures all values in a column are unique?",                                  expectedOutput: "UNIQUE",           difficulty: "Medium" },
  { id: 26, category: "SQL",       question: "What SQL keyword adds a new column to an existing table?",                                        expectedOutput: "ALTER TABLE",      difficulty: "Medium" },
  { id: 27, category: "SQL",       question: "What SQL function concatenates two or more strings?",                                             expectedOutput: "CONCAT",           difficulty: "Medium" },
  { id: 28, category: "SQL",       question: "What SQL JOIN returns all rows when there is a match in either table?",                           expectedOutput: "FULL OUTER JOIN",  difficulty: "Hard"   },
  { id: 29, category: "SQL",       question: "What SQL keyword limits the number of rows returned?",                                            expectedOutput: "LIMIT",            difficulty: "Easy"   },
  { id: 30, category: "SQL",       question: "What SQL clause is used for pattern matching with wildcards?",                                    expectedOutput: "LIKE",             difficulty: "Medium" },

  // --- Apache Spark (10) ---
  { id: 31, category: "Spark",     question: "What Spark operation triggers immediate execution and returns results to driver?",                 expectedOutput: "action",           difficulty: "Easy"   },
  { id: 32, category: "Spark",     question: "What Spark operation creates a new RDD but delays execution until action?",                       expectedOutput: "transformation",   difficulty: "Easy"   },
  { id: 33, category: "Spark",     question: "What Spark component manages memory and CPU cores for each executor?",                            expectedOutput: "Executor",         difficulty: "Medium" },
  { id: 34, category: "Spark",     question: "What Spark persistence level stores data in memory and spills to disk?",                          expectedOutput: "MEMORY_AND_DISK",  difficulty: "Medium" },
  { id: 35, category: "Spark",     question: "What Spark transformation combines values with same key using a function?",                       expectedOutput: "reduceByKey",      difficulty: "Medium" },
  { id: 36, category: "Spark",     question: "What Spark concept represents the number of parallel tasks per stage?",                           expectedOutput: "parallelism",      difficulty: "Hard"   },
  { id: 37, category: "Spark",     question: "What Spark component tracks lineage and schedules tasks across cluster?",                         expectedOutput: "Driver",           difficulty: "Medium" },
  { id: 38, category: "Spark",     question: "What Spark operation shuffles data across partitions for aggregation?",                           expectedOutput: "shuffle",          difficulty: "Hard"   },
  { id: 39, category: "Spark",     question: "What Spark action returns first n elements from RDD to driver?",                                  expectedOutput: "take",             difficulty: "Easy"   },
  { id: 40, category: "Spark",     question: "What Spark transformation applies function to each partition independently?",                     expectedOutput: "mapPartitions",    difficulty: "Hard"   },

  // --- Snowflake (10) ---
  { id: 41, category: "Snowflake", question: "What Snowflake clause filters results after window functions without subquery?",                  expectedOutput: "QUALIFY",          difficulty: "Hard"   },
  { id: 42, category: "Snowflake", question: "What Snowflake function returns the value with maximum associated measure?",                     expectedOutput: "MAX_BY",           difficulty: "Hard"   },
  { id: 43, category: "Snowflake", question: "What Snowflake clause groups by all non-aggregated columns automatically?",                      expectedOutput: "GROUP BY ALL",     difficulty: "Hard"   },
  { id: 44, category: "Snowflake", question: "What Snowflake clause selects all columns except specified ones?",                               expectedOutput: "EXCLUDE",          difficulty: "Hard"   },
  { id: 45, category: "Snowflake", question: "What Snowflake function returns the value with minimum associated measure?",                     expectedOutput: "MIN_BY",           difficulty: "Hard"   },
  { id: 46, category: "Snowflake", question: "What Snowflake feature allows querying data as it existed at past timestamp?",                   expectedOutput: "Time Travel",      difficulty: "Medium" },
  { id: 47, category: "Snowflake", question: "What Snowflake clause renames columns in SELECT without AS keyword?",                            expectedOutput: "RENAME",           difficulty: "Hard"   },
  { id: 48, category: "Snowflake", question: "What Snowflake function flattens nested JSON arrays into rows?",                                 expectedOutput: "FLATTEN",          difficulty: "Medium" },
  { id: 49, category: "Snowflake", question: "What Snowflake object stores query results for reuse without recomputation?",                    expectedOutput: "Result Cache",     difficulty: "Medium" },
  { id: 50, category: "Snowflake", question: "What Snowflake clause replaces columns with new expressions inline?",                            expectedOutput: "REPLACE",          difficulty: "Hard"   }
];
