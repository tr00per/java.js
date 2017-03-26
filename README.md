# java.js
Run Java bytecode in a browser. Because why not?

# But... why?
For exercise! I know some Java, I know some JavaScript, then why not try to combine them!

This is an exercise, I start with no research of previous attempts of such kind, and hopefully no one would use this code in production. Don't do it.

There are multiple prototype languages that take code written in another language and try to run it on JavaScript. Then my language of choice is Java bytecode. The fun part is, if it works, then you could run simple programs compiled from Java, Scala, Clojure, etc., without them knowing.

It might be useful in some narrow cases, but my target is a toy. To some point this should be straightforward, until filesystem access or threads come along.

# TODO
1. "Hello, world!"
    - read a *.class* file
    - find the definition of a class in it
    - find `public static main`
    - "run the code", which would print the string in the browser's console
2. "Hello, world" with some simple arithmetic operations along the way
3. "Hello, world" from a separate function
4. "Hello, world" from another class in another package
5. ???
6. Profit!
