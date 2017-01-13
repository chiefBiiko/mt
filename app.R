library(shiny)
library(miniUI)

mtInit <- function(inputValue1, inputValue2) {
  
  ui <- miniPage(  # http://stackoverflow.com/questions/24973549/r-shiny-key-input-binding
    tags$head(tags$script('
    $(document).on("keydown", function (e) {
      Shiny.onInputChange("keyz", e.which);
    });
    ')),
    gadgetTitleBar(strong('mt')),
    miniContentPanel(  # Define layout, inputs, outputs
      textInput('line', NULL, '', '100%', 'Enter URLs'),
      strong('Input URLs:'),
      htmlOutput('mirror'),
      br(),
      checkboxGroupInput('checks', 'Choose which meta info to get', 
                         choices = list("Title"=1, "Description"=2, "Keywords"=3),
                         selected = c(1, 2, 3)),
      miniButtonBlock(actionButton('submit', 'Go!')),
      htmlOutput('success')
    )
  )

  server <- function(input, output, session) {  # input$checks
    store <- reactiveValues(uris=character(), cnvt=character(),
                            params=list(), mrx=matrix())
    observeEvent(input$keyz, {  # observer, updates store conditionally
      if (grepl('^https?://[^\\.]+\\..{2,}', input$line) & input$keyz == 13) {
        store$uris[length(store$uris)+1] <- trimws(input$line)
        updateTextInput(session, 'line', NULL, '')
      }
    })
    
    output$mirror <- renderUI({  # let only store update ui #mirror
      store$cnvt <- sapply(store$uris, function(x) { paste0(x, '<br/>') })
      HTML(paste0(store$cnvt))
    })
    
    observeEvent(input$done, { stopApp('done') })  # @param Return value
  }
  
  runGadget(ui, server)
}

mtInit()