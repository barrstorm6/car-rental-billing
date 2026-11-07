import {prisma} from "@/lib/prisma";

export async function getRentals(rentalId:string){
return prisma.rental.findUnique({
    where:{
      id:rentalId,
    }
})
}

export async function getCar(carId:string){
    return prisma.car.findUnique({
       where:{
           id:carId
       }
    })
}

export async function getPricingRule(ruleId:string){
    return prisma.pricingRule.findUnique({
        where:{
            id:ruleId,
        }
    })
}


export async function getRentalReturns(returnsId:string){
    return prisma.rentalReturn.findUnique({
        where:{
            id:returnsId,
        }
    })
}

export async function getRentalInvoice(invoiceId:string){
    return prisma.rentalInvoice.findUnique({
        where:{
            id:invoiceId,
        }
    })
}

